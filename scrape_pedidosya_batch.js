#!/usr/bin/env node
/**
 * Slow PedidosYa batch scrape — one store at a time with long pauses
 * to reduce PerimeterX / Cloudflare blocks.
 *
 * Usage:
 *   KERNEL_API_KEY=... node scrape_pedidosya_batch.js
 *   KERNEL_API_KEY=... node scrape_pedidosya_batch.js --only=peya-bembos,peya-kfc
 *   KERNEL_API_KEY=... node scrape_pedidosya_batch.js --skip=peya-mcdonalds
 */
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { STORES } = require('./pedidosya_stores');
const { stamp } = require('./scrape_meta');

const PAUSE_MS = Number(process.env.PEYA_PAUSE_MS || 90000); // 90s between stores
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const skipArg = process.argv.find(a => a.startsWith('--skip='));
const only = onlyArg ? onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : null;
const skip = new Set(skipArg ? skipArg.slice(7).split(',').map(s => s.trim()).filter(Boolean) : []);

const queue = STORES.filter(s => s.url && (!only || only.includes(s.id)) && !skip.has(s.id));

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function uploadSuccess(storeId) {
    const local = path.join(__dirname, 'data', `products_${storeId}.json`);
    if (!fs.existsSync(local)) return;
    try {
        stamp(storeId);
        execSync(`gcloud storage cp "${local}" "gs://ngr-scraping-data/products_${storeId}.json"`, {
            stdio: 'inherit',
        });
        const meta = path.join(__dirname, 'scrape_meta.json');
        if (fs.existsSync(meta)) {
            execSync(`gcloud storage cp "${meta}" "gs://ngr-scraping-data/scrape_meta.json"`, {
                stdio: 'inherit',
            });
        }
        console.log(`[GCS] uploaded products_${storeId}.json`);
    } catch (e) {
        console.warn(`[GCS] upload failed for ${storeId}: ${e.message}`);
    }
}

function runOne(store) {
    return new Promise((resolve) => {
        console.log(`\n======== ${store.id} · ${store.name} ========`);
        console.log(store.url);
        const child = spawn(
            process.execPath,
            [path.join(__dirname, 'pedidosya_scraper.js'), store.url, store.id],
            { cwd: __dirname, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
        );
        let out = '';
        child.stdout.on('data', d => { const s = d.toString(); out += s; process.stdout.write(s); });
        child.stderr.on('data', d => { const s = d.toString(); out += s; process.stderr.write(s); });
        child.on('close', (code) => {
            const rootFile = path.join(__dirname, `products_${store.id}.json`);
            const ok = code === 0 && fs.existsSync(rootFile);
            if (ok) {
                try {
                    fs.copyFileSync(rootFile, path.join(__dirname, 'data', `products_${store.id}.json`));
                } catch (_) {}
                uploadSuccess(store.id);
            }
            resolve({ id: store.id, ok, code, out: out.slice(-500) });
        });
    });
}

(async () => {
    console.log(`PedidosYa batch: ${queue.length} stores · pause ${PAUSE_MS / 1000}s`);
    if (skip.size) console.log(`Skipping: ${[...skip].join(', ')}`);
    const results = [];
    for (let i = 0; i < queue.length; i++) {
        const store = queue[i];
        const result = await runOne(store);
        results.push(result);
        console.log(result.ok ? `✓ ${store.id}` : `✗ ${store.id} (code ${result.code})`);
        if (i < queue.length - 1) {
            // Extra cooldown after failures (PX / HTML menus responses)
            const extra = result.ok ? 0 : Math.min(PAUSE_MS, 120000);
            const wait = PAUSE_MS + extra;
            console.log(`Pausa ${wait / 1000}s antes del siguiente…`);
            await sleep(wait);
        }
    }
    const summary = {
        finishedAt: new Date().toISOString(),
        ok: results.filter(r => r.ok).map(r => r.id),
        failed: results.filter(r => !r.ok).map(r => r.id),
    };
    fs.writeFileSync(path.join(__dirname, 'peya_batch_results.json'), JSON.stringify(summary, null, 2));
    console.log('\nDone', summary);
    process.exit(summary.failed.length ? 1 : 0);
})().catch(e => {
    console.error(e);
    process.exit(1);
});
