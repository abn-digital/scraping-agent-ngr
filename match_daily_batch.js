#!/usr/bin/env node
/**
 * Daily match job: for every brand × channel with catalog data, run Gemini matching,
 * write matches_<brand>_<channel>.json (latest), and snapshot under match_snapshots/
 * for America's Lima calendar day. Past dated snapshots are never overwritten.
 *
 * Includes channel=cross (same brand across Rappi / PeYa / Propio).
 *
 *   node match_daily_batch.js
 *   node match_daily_batch.js --only=bembos/rappi,dunkin/cross
 *   SKIP_GCS_UPLOAD=1 node match_daily_batch.js
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { BRANDS, CHANNELS, CROSS_CHANNEL, getChannelConfig, getCrossChannelConfig } = require('./brand_config');
const { matchBrand, outputPath } = require('./product_matcher');
const matchSnapshots = require('./match_snapshots');

const GCS_BUCKET = process.env.GCS_BUCKET || 'ngr-scraping-data';
const UPLOAD_GCS = process.env.SKIP_GCS_UPLOAD !== '1';
const gcs = new Storage();

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg
  ? new Set(onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean))
  : null;

function hasProducts(id) {
  for (const p of [
    path.join(__dirname, `products_${id}.json`),
    path.join(__dirname, 'data', `products_${id}.json`),
  ]) {
    if (fs.existsSync(p)) {
      try {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(arr) && arr.length > 0) return true;
      } catch (_) {}
    }
  }
  return false;
}

async function uploadLatest(localPath) {
  if (!UPLOAD_GCS) return;
  const fileName = path.basename(localPath);
  try {
    await gcs.bucket(GCS_BUCKET).upload(localPath, { destination: fileName });
    console.log(`   [GCS] gs://${GCS_BUCKET}/${fileName}`);
  } catch (e) {
    console.warn(`   [GCS] upload failed: ${e.message}`);
  }
}

function canRunJob(brandKey, channel) {
  if (channel === CROSS_CHANNEL) {
    const cfg = getCrossChannelConfig(brandKey);
    if (!cfg) return false;
    if (!hasProducts(cfg.anchorId)) return false;
    return cfg.competitors.some(c => hasProducts(c.id));
  }
  const cfg = getChannelConfig(brandKey, channel);
  if (!cfg) return false;
  if (!hasProducts(cfg.anchorId)) return false;
  return cfg.competitors.some(c => hasProducts(c.id));
}

async function main() {
  const jobs = [];
  for (const brand of BRANDS) {
    for (const channel of [...CHANNELS, CROSS_CHANNEL]) {
      const key = `${brand.key}/${channel}`;
      if (only && !only.has(key) && !only.has(brand.key) && !only.has(channel)) continue;
      if (!canRunJob(brand.key, channel)) {
        console.log(`skip ${key} — missing catalog data`);
        continue;
      }
      jobs.push({ brand: brand.key, channel });
    }
  }

  console.log(`Daily match batch: ${jobs.length} jobs · date=${matchSnapshots.todayPeru()}`);
  const results = { ok: [], failed: [] };

  for (const job of jobs) {
    const label = `${job.brand}/${job.channel}`;
    console.log(`\n======== ${label} ========`);
    try {
      const result = await matchBrand(job.brand, job.channel);
      const outPath = outputPath(job.brand, job.channel);
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
      await uploadLatest(outPath);
      const snap = await matchSnapshots.saveSnapshot(job.brand, job.channel, result);
      console.log(`✓ ${label}: ${result.rows.length} rows · snapshot ${snap.date} written=${snap.written}`);
      results.ok.push(label);
    } catch (e) {
      console.error(`✗ ${label}: ${e.message}`);
      results.failed.push({ job: label, error: e.message });
    }
  }

  console.log('\nDone', JSON.stringify(results, null, 2));
  if (results.failed.length) process.exitCode = 1;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
