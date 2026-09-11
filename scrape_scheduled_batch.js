#!/usr/bin/env node
/**
 * Daily batch for Propio + Rappi (not PedidosYa).
 *
 *   KERNEL_API_KEY=... node scrape_scheduled_batch.js
 *   KERNEL_API_KEY=... node scrape_scheduled_batch.js --only=chifaexpress-pe,742
 *   KERNEL_API_KEY=... node scrape_scheduled_batch.js --skip=starbucks-pe
 *
 * Env:
 *   SCHED_PAUSE_MS         pause between stores (default 15000)
 *   SCHED_RETRY_MAX        extra passes for failures after the first (default 2)
 *   SCHED_RETRY_DELAY_MS   wait before each retry pass (default 300000 = 5 min)
 *   PEYA_RESYNC_URL        optional POST to refresh Cloud Run disk from GCS
 *   CRON_SECRET            X-Cron-Secret for resync
 *   GCS_BUCKET             default ngr-scraping-data
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { STORES } = require('./scheduled_stores');
const { stamp } = require('./scrape_meta');
const historyStore = require('./history_store');

const PAUSE_MS = Number(process.env.SCHED_PAUSE_MS || 15000);
const RETRY_MAX = Math.max(0, Number(process.env.SCHED_RETRY_MAX || 2));
const RETRY_DELAY_MS = Number(process.env.SCHED_RETRY_DELAY_MS || 300000);
const GCS_BUCKET = process.env.GCS_BUCKET || 'ngr-scraping-data';
const gcs = new Storage();

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const skipArg = process.argv.find(a => a.startsWith('--skip='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null;
const skip = new Set(skipArg ? skipArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : []);
const queue = STORES.filter(s => s.script && (!only || only.includes(s.id)) && !skip.has(s.id));

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function uploadLocal(localPath, destination) {
    if (!fs.existsSync(localPath)) return;
    await gcs.bucket(GCS_BUCKET).upload(localPath, {
        destination: destination || path.basename(localPath),
    });
    console.log(`[GCS] uploaded gs://${GCS_BUCKET}/${destination || path.basename(localPath)}`);
}

async function mergeStampFromGcs(storeId, scrapedAt) {
    try {
        const [buf] = await gcs.bucket(GCS_BUCKET).file('scrape_meta.json').download();
        const remote = JSON.parse(buf.toString('utf8'));
        const localPath = path.join(__dirname, 'scrape_meta.json');
        const local = fs.existsSync(localPath) ? JSON.parse(fs.readFileSync(localPath, 'utf8')) : {};
        const merged = { ...remote };
        for (const [k, v] of Object.entries(local)) {
            if (!merged[k] || new Date(v) > new Date(merged[k])) merged[k] = v;
        }
        merged[storeId] = scrapedAt;
        fs.writeFileSync(localPath, JSON.stringify(merged, null, 2) + '\n');
    } catch (e) {
        console.warn(`[meta] merge GCS failed: ${e.message}`);
        stamp(storeId, scrapedAt);
    }
}

async function publishSuccess(storeId) {
    const scrapedAt = new Date().toISOString();
    const root = path.join(__dirname, `products_${storeId}.json`);
    const dataFile = path.join(__dirname, 'data', `products_${storeId}.json`);
    const local = fs.existsSync(root) ? root : dataFile;
    if (!fs.existsSync(local)) {
        console.warn(`[publish] missing products_${storeId}.json`);
        return false;
    }
    try {
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.copyFileSync(local, dataFile);
    } catch (_) {}

    let products;
    try {
        products = JSON.parse(fs.readFileSync(local, 'utf8'));
    } catch (e) {
        console.warn(`[publish] bad JSON ${storeId}: ${e.message}`);
        return false;
    }
    if (!Array.isArray(products) || products.length === 0) {
        console.warn(`[publish] empty catalog ${storeId}`);
        return false;
    }

    await mergeStampFromGcs(storeId, scrapedAt);
    stamp(storeId, scrapedAt);
    try {
        await uploadLocal(local, `products_${storeId}.json`);
        await uploadLocal(path.join(__dirname, 'scrape_meta.json'), 'scrape_meta.json');
    } catch (e) {
        console.warn(`[GCS] ${e.message}`);
    }
    try {
        await historyStore.appendRun({ storeId, scrapedAt, products });
    } catch (e) {
        console.warn(`[history] ${e.message}`);
    }
    return true;
}

function runOne(store, { attemptLabel = '' } = {}) {
    return new Promise((resolve) => {
        const label = attemptLabel ? ` ${attemptLabel}` : '';
        console.log(`\n======== ${store.id} · ${store.name} · ${store.platform}${label} ========`);
        console.log(store.script, store.url);
        const child = spawn(
            process.execPath,
            [path.join(__dirname, store.script), store.url],
            {
                cwd: __dirname,
                env: {
                    ...process.env,
                    PLAYWRIGHT_CHROMIUM_LAUNCH_OPTIONS: JSON.stringify({
                        args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    }),
                },
                stdio: ['ignore', 'pipe', 'pipe'],
            }
        );
        let out = '';
        child.stdout.on('data', d => { const s = d.toString(); out += s; process.stdout.write(s); });
        child.stderr.on('data', d => { const s = d.toString(); out += s; process.stderr.write(s); });
        child.on('close', async (code) => {
            const rootFile = path.join(__dirname, `products_${store.id}.json`);
            const dataFile = path.join(__dirname, 'data', `products_${store.id}.json`);
            let published = false;
            if (code === 0 && (fs.existsSync(rootFile) || fs.existsSync(dataFile))) {
                published = await publishSuccess(store.id);
            }
            resolve({
                id: store.id,
                ok: Boolean(published),
                code,
                out: out.slice(-400),
            });
        });
    });
}

async function runPass(stores, { passName, pauseMs }) {
    const results = [];
    for (let i = 0; i < stores.length; i++) {
        const store = stores[i];
        const result = await runOne(store, { attemptLabel: passName });
        results.push(result);
        console.log(`[${passName} ${i + 1}/${stores.length}] ${store.id} → ${result.ok ? 'OK' : 'FAIL'} (exit ${result.code})`);
        if (i < stores.length - 1) await sleep(pauseMs);
    }
    return results;
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
            body: JSON.stringify({ source: 'scheduled-batch' }),
        });
        const text = await res.text();
        console.log(`[resync] ${res.status} ${text.slice(0, 200)}`);
    } catch (e) {
        console.warn(`[resync] failed: ${e.message}`);
    }
}

(async () => {
    console.log(`Scheduled batch: ${queue.length} stores · pause ${PAUSE_MS / 1000}s · retries ${RETRY_MAX} × ${RETRY_DELAY_MS / 1000}s`);
    if (skip.size) console.log(`Skipping: ${[...skip].join(', ')}`);
    if (!process.env.KERNEL_API_KEY) {
        console.warn('KERNEL_API_KEY missing — scrapers may fall back to local Chromium');
    }

    const byId = new Map(queue.map(s => [s.id, s]));
    const first = await runPass(queue, { passName: 'pass-1', pauseMs: PAUSE_MS });
    const outcome = new Map(first.map(r => [r.id, r]));

    let pending = first.filter(r => !r.ok).map(r => r.id);
    for (let retry = 1; retry <= RETRY_MAX && pending.length > 0; retry++) {
        console.log(`\n── Retry pass ${retry}/${RETRY_MAX}: ${pending.length} store(s) after ${RETRY_DELAY_MS / 1000}s ──`);
        await sleep(RETRY_DELAY_MS);
        const retryStores = pending.map(id => byId.get(id)).filter(Boolean);
        // Cooler traffic on sites that just failed / blocked us
        const retryPause = Math.max(PAUSE_MS, 30000);
        const retryResults = await runPass(retryStores, {
            passName: `retry-${retry}`,
            pauseMs: retryPause,
        });
        for (const r of retryResults) outcome.set(r.id, r);
        pending = retryResults.filter(r => !r.ok).map(r => r.id);
        if (pending.length === 0) {
            console.log(`All previously failed stores recovered on retry-${retry}.`);
        }
    }

    const results = [...outcome.values()];
    const ok = results.filter(r => r.ok).length;
    const fail = results.length - ok;
    console.log(`\nDone: ${ok} ok · ${fail} fail · ${results.length} total`);
    for (const r of results.filter(r => !r.ok)) {
        console.log(`  FAIL ${r.id} code=${r.code}`);
    }

    await resyncDashboard();
    // Non-zero if everything failed; partial success still exits 0 so cron doesn't retry-storm
    if (ok === 0 && results.length > 0) process.exit(1);
})().catch(err => {
    console.error(err);
    process.exit(1);
});
