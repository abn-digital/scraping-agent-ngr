#!/usr/bin/env node
/**
 * Seed today's match snapshots from existing matches_<brand>_<channel>.json
 * without re-running Gemini. Past dates are never overwritten by saveSnapshot.
 *
 *   node seed_match_snapshots.js
 *   node seed_match_snapshots.js --only=bembos/rappi
 */
const fs = require('fs');
const path = require('path');
const { BRANDS, CHANNELS } = require('./brand_config');
const matchSnapshots = require('./match_snapshots');

const onlyArg = process.argv.find(a => a.startsWith('--only='));
const only = onlyArg
  ? new Set(onlyArg.slice(7).split(',').map(s => s.trim()).filter(Boolean))
  : null;

async function main() {
  const today = matchSnapshots.todayPeru();
  console.log(`Seeding snapshots for ${today}`);
  let ok = 0, skip = 0;
  for (const brand of BRANDS) {
    for (const channel of CHANNELS) {
      const key = `${brand.key}/${channel}`;
      if (only && !only.has(key) && !only.has(brand.key)) continue;
      const fp = path.join(__dirname, `matches_${brand.key}_${channel}.json`);
      if (!fs.existsSync(fp)) {
        console.log(`skip ${key} — no matches file`);
        skip++;
        continue;
      }
      const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const snap = await matchSnapshots.saveSnapshot(brand.key, channel, raw, today);
      console.log(`${key}: written=${snap.written}${snap.reason ? ` (${snap.reason})` : ''}`);
      if (snap.written) ok++; else skip++;
    }
  }
  console.log(`Done · written=${ok} skipped=${skip}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
