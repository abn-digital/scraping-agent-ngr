#!/usr/bin/env node
/**
 * Single-session PedidosYa batch with browser recovery.
 *
 *   KERNEL_API_KEY=... node scrape_pedidosya_session.js
 *   KERNEL_API_KEY=... node scrape_pedidosya_session.js --only=peya-kfc,peya-yopo
 *   KERNEL_API_KEY=... node scrape_pedidosya_session.js --skip=peya-mcdonalds
 *
 * Env:
 *   PEYA_PAUSE_MS      pause between stores (default 60000)
 *   PEYA_RESYNC_URL    optional POST URL to refresh Cloud Run disk from GCS
 *   CRON_SECRET        shared secret for X-Cron-Secret on resync
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const { STORES, GEO_WARM_URL } = require('./pedidosya_stores');
const { stamp } = require('./scrape_meta');
const historyStore = require('./history_store');

const PAUSE_MS = Number(process.env.PEYA_PAUSE_MS || 60000);
const GCS_BUCKET = process.env.GCS_BUCKET || 'ngr-scraping-data';
const gcs = new Storage();

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const skipArg = process.argv.find(a => a.startsWith('--skip='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null;
const skip = new Set(skipArg ? skipArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : []);
const queue = STORES.filter(s => s.url && (!only || only.includes(s.id)) && !skip.has(s.id));

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function cleanRestaurantName(name) {
    if (!name) return '';
    return String(name).replace(/^men[uú]\s+de\s+/i, '').replace(/\s+/g, ' ').trim();
}

function parsePrice(item) {
    const raw = item?.price;
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object') {
        const n = raw.finalPrice ?? raw.originalPrice ?? raw.amount ?? raw.value;
        if (typeof n === 'number') return n;
        if (typeof n === 'string') return parseFloat(n.replace(/[^\d.]/g, '')) || 0;
    }
    if (typeof item.unitPrice === 'number') return item.unitPrice;
    if (typeof item.originalPrice === 'number') return item.originalPrice;
    if (typeof raw === 'string') return parseFloat(raw.replace(/[^\d.]/g, '')) || 0;
    return 0;
}

function itemsToProducts(items, category, restaurantName) {
    return (items || [])
        .filter(item => item && (item.name || item.title))
        .filter(item => item.enabled !== false && item.available !== false && item.outOfStock !== true)
        .map(item => ({
            restaurant: restaurantName,
            category,
            name: item.name || item.title || '',
            description: (item.description || item.desc || item.detail || '').trim(),
            price: parsePrice(item),
            inStock: true,
        }));
}

function extractFromApiData(data) {
    if (!data || typeof data !== 'object') return { products: [], restaurantName: '' };
    const name = cleanRestaurantName(data.name || data.restaurantName || data.restaurant?.name || '');
    const sections = data.sections || data.menuSections
        || data.data?.sections || data.restaurant?.sections
        || data.menu?.sections || data.result?.sections;
    if (!sections || !Array.isArray(sections)) return { products: [], restaurantName: name };
    const products = [];
    for (const section of sections) {
        const category = section.name || section.title || 'General';
        const items = section.products || section.items || section.menuItems || [];
        products.push(...itemsToProducts(items, category, name));
    }
    return { products, restaurantName: name };
}

async function uploadLocal(localPath) {
    if (!fs.existsSync(localPath)) return;
    const fileName = path.basename(localPath);
    await gcs.bucket(GCS_BUCKET).upload(localPath, { destination: fileName });
    console.log(`[GCS] uploaded gs://${GCS_BUCKET}/${fileName}`);
}

async function mergeStampFromGcs(storeId) {
    // Pull remote meta first so a partial batch does not wipe other store stamps
    try {
        const [buf] = await gcs.bucket(GCS_BUCKET).file('scrape_meta.json').download();
        const remote = JSON.parse(buf.toString('utf8'));
        const localPath = path.join(__dirname, 'scrape_meta.json');
        const local = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, 'utf8')) : {};
        const merged = { ...remote, ...local };
        for (const [k, v] of Object.entries(local)) {
            if (!merged[k] || new Date(v) > new Date(merged[k])) merged[k] = v;
        }
        for (const [k, v] of Object.entries(remote)) {
            if (!merged[k] || new Date(v) > new Date(merged[k])) merged[k] = v;
        }
        fs.writeFileSync(localPath, JSON.stringify(merged, null, 2) + '\n');
    } catch (e) {
        console.warn(`[meta] could not merge GCS scrape_meta: ${e.message}`);
    }
    stamp(storeId);
}

async function saveProducts(products, storeId) {
    const scrapedAt = new Date().toISOString();
    const root = path.join(__dirname, `products_${storeId}.json`);
    const dataFile = path.join(__dirname, 'data', `products_${storeId}.json`);
    fs.writeFileSync(root, JSON.stringify(products, null, 2));
    try {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.copyFileSync(root, dataFile);
    } catch (_) {}
    await mergeStampFromGcs(storeId);
    // Re-stamp with the exact scrapedAt we use for history so meta ↔ run align
    stamp(storeId, scrapedAt);
    try {
        await uploadLocal(dataFile);
        await uploadLocal(path.join(__dirname, 'scrape_meta.json'));
    } catch (e) {
        console.warn(`[GCS] ${e.message}`);
    }
    try {
        await historyStore.appendRun({ storeId, scrapedAt, products });
    } catch (e) {
        console.warn(`[history] ${e.message}`);
    }
}

async function resyncDashboard() {
    const url = process.env.PEYA_RESYNC_URL;
    const secret = String(process.env.CRON_SECRET || '').trim();
    if (!url || !secret) {
        console.log('[resync] skipped (PEYA_RESYNC_URL / CRON_SECRET not set)');
        return;
    }
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Cron-Secret': secret,
            },
            body: JSON.stringify({ source: 'peya-batch' }),
        });
        const text = await res.text();
        console.log(`[resync] ${res.status} ${text.slice(0, 200)}`);
    } catch (e) {
        console.warn(`[resync] failed: ${e.message}`);
    }
}

function isDeadBrowserError(err) {
    const m = String(err?.message || err || '');
    return /has been closed|Target page|browser has been closed|Session closed|Connection closed/i.test(m);
}

async function openSession() {
    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });
    const page = await context.newPage();
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8' });
    const state = { menuJson: null };
    page.on('response', async (response) => {
        try {
            const respUrl = response.url();
            if (!/\/v2\/niles\/partners\/\d+\/menus/i.test(respUrl) || response.status() !== 200) return;
            const ct = response.headers()['content-type'] || '';
            if (!ct.includes('json')) return;
            const text = await response.text();
            if (!text || text.trimStart().startsWith('<')) return;
            const json = JSON.parse(text);
            if (json?.sections?.length) {
                state.menuJson = json;
                console.log(`[API] intercept sections=${json.sections.length}`);
            }
        } catch (_) {}
    });
    return { browser, context, kernelBrowser, kernel, page, state };
}

async function warm(page) {
    console.log('[Warm] home…');
    await page.goto('https://www.pedidosya.com.pe/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(5000);
    console.log('[Warm] geo…');
    await page.goto(GEO_WARM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    const warmText = await page.evaluate(() => (document.body?.innerText || '').slice(0, 200));
    if (/denegado|humano/i.test(warmText)) throw new Error('Blocked on warm-up');
}

async function captureMenu(page, state, url) {
    state.menuJson = null;
    const menuWait = page.waitForResponse(
        (r) => r.status() === 200
            && /\/v2\/niles\/partners\/\d+\/menus/i.test(r.url())
            && (r.headers()['content-type'] || '').includes('json'),
        { timeout: 50000 }
    ).catch(() => null);

    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    console.log(`[HTTP] ${resp?.status()} → ${page.url()}`);
    if (resp?.status() === 403 || resp?.status() === 451) {
        throw new Error(`Blocked HTTP ${resp.status()}`);
    }

    await page.waitForTimeout(3500);
    const menuResp = await menuWait;
    if (!state.menuJson && menuResp) {
        try {
            const json = await menuResp.json();
            if (json?.sections) {
                state.menuJson = json;
                console.log(`[API] Menú natural sections=${json.sections.length}`);
            }
        } catch (e) {
            console.warn(`[API] natural parse: ${e.message}`);
        }
    }
    for (let i = 0; i < 10 && !state.menuJson; i++) await page.waitForTimeout(400);
    return state.menuJson;
}

(async () => {
    console.log(`PedidosYa session batch: ${queue.length} stores · pause ${PAUSE_MS / 1000}s`);
    if (skip.size) console.log(`Skipping: ${[...skip].join(', ')}`);

    let session = await openSession();
    const results = { ok: [], failed: [] };

    try {
        await warm(session.page);

        for (let i = 0; i < queue.length; i++) {
            const store = queue[i];
            console.log(`\n======== ${store.id} · ${store.name} (${i + 1}/${queue.length}) ========`);
            console.log(store.url);

            let attempt = 0;
            let done = false;
            while (attempt < 2 && !done) {
                attempt += 1;
                try {
                    let menu = await captureMenu(session.page, session.state, store.url);
                    if (!menu) {
                        console.log('[Retry] cooldown + re-warm + reload…');
                        await sleep(15000);
                        await session.page.goto('https://www.pedidosya.com.pe/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
                        await sleep(4000);
                        await session.page.goto(GEO_WARM_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
                        await sleep(4000);
                        menu = await captureMenu(session.page, session.state, store.url);
                    }
                    if (!menu?.sections) throw new Error('No menus JSON');

                    const pageTitle = cleanRestaurantName(await session.page.evaluate(() =>
                        (document.querySelector('h1')?.textContent || '').trim()
                    ).catch(() => ''));
                    const extracted = extractFromApiData(menu);
                    let products = extracted.products.filter(p => p.price > 0);
                    const restaurantName = pageTitle || cleanRestaurantName(extracted.restaurantName) || store.name;
                    products = products.map(p => ({
                        ...p,
                        restaurant: restaurantName,
                        description: (p.description || '').trim(),
                    }));
                    if (!products.length) throw new Error('0 products after parse');

                    await saveProducts(products, store.id);
                    const withDesc = products.filter(p => p.description).length;
                    console.log(`✓ ${store.id}: ${products.length} SKUs (${withDesc} con descripción) · ${restaurantName}`);
                    results.ok.push(store.id);
                    done = true;
                } catch (e) {
                    console.error(`✗ ${store.id} (attempt ${attempt}): ${e.message}`);
                    const retryable = isDeadBrowserError(e) || /No menus JSON/i.test(e.message);
                    if (retryable && attempt < 2) {
                        console.log('[Recover] recreando browser Kernel…');
                        try { await closeKernelBrowser(session); } catch (_) {}
                        await sleep(20000);
                        session = await openSession();
                        await warm(session.page);
                        continue;
                    }
                    results.failed.push(store.id);
                    done = true;
                }
            }

            if (i < queue.length - 1) {
                const wait = results.failed.includes(store.id) ? Math.max(PAUSE_MS, 90000) : PAUSE_MS;
                console.log(`Pausa ${wait / 1000}s…`);
                await sleep(wait);
            }
        }

        // Final delayed retry for stores that still failed
        const RETRY_MAX = Math.max(0, Number(process.env.PEYA_RETRY_MAX || 1));
        const RETRY_DELAY_MS = Number(process.env.PEYA_RETRY_DELAY_MS || 300000);
        for (let retry = 1; retry <= RETRY_MAX && results.failed.length > 0; retry++) {
            const toRetry = [...results.failed];
            console.log(`\n── PeYa retry ${retry}/${RETRY_MAX}: ${toRetry.length} store(s) after ${RETRY_DELAY_MS / 1000}s ──`);
            await sleep(RETRY_DELAY_MS);
            results.failed = [];
            for (let i = 0; i < toRetry.length; i++) {
                const storeId = toRetry[i];
                const store = queue.find(s => s.id === storeId);
                if (!store) continue;
                console.log(`\n======== RETRY ${store.id} · ${store.name} ========`);
                try {
                    let menu = await captureMenu(session.page, session.state, store.url);
                    if (!menu?.sections) throw new Error('No menus JSON');
                    const pageTitle = cleanRestaurantName(await session.page.evaluate(() =>
                        (document.querySelector('h1')?.textContent || '').trim()
                    ).catch(() => ''));
                    const extracted = extractFromApiData(menu);
                    let products = extracted.products.filter(p => p.price > 0);
                    const restaurantName = pageTitle || cleanRestaurantName(extracted.restaurantName) || store.name;
                    products = products.map(p => ({
                        ...p,
                        restaurant: restaurantName,
                        description: (p.description || '').trim(),
                    }));
                    if (!products.length) throw new Error('0 products after parse');
                    await saveProducts(products, store.id);
                    console.log(`✓ ${store.id} (retry): ${products.length} SKUs · ${restaurantName}`);
                    if (!results.ok.includes(store.id)) results.ok.push(store.id);
                } catch (e) {
                    console.error(`✗ ${store.id} (retry ${retry}): ${e.message}`);
                    results.failed.push(store.id);
                    if (isDeadBrowserError(e)) {
                        try { await closeKernelBrowser(session); } catch (_) {}
                        await sleep(20000);
                        session = await openSession();
                        await warm(session.page);
                    }
                }
                if (i < toRetry.length - 1) await sleep(Math.max(PAUSE_MS, 90000));
            }
        }
    } finally {
        try { await closeKernelBrowser(session); } catch (_) {}
    }

    const summary = { finishedAt: new Date().toISOString(), ...results };
    fs.writeFileSync(path.join(__dirname, 'peya_batch_results.json'), JSON.stringify(summary, null, 2));
    try { await uploadLocal(path.join(__dirname, 'peya_batch_results.json')); } catch (_) {}
    console.log('\nDone', summary);

    await resyncDashboard();
    process.exit(results.failed.length ? 1 : 0);
})().catch(e => {
    console.error(e);
    process.exit(1);
});
