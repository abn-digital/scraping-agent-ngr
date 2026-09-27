/**
 * Daily match snapshots — immutable once the calendar day (America/Lima) has passed.
 *
 * Layout (GCS + local mirror under data/ and cwd):
 *   match_snapshots/<brand>/<channel>/<YYYY-MM-DD>.json
 *   match_snapshots/<brand>/<channel>/index.json   → { dates: [{ date, generatedAt, rowCount }] }
 *
 * "Latest" live file remains matches_<brand>_<channel>.json (unchanged).
 * Recalculate today may overwrite today's snapshot; past dates are never rewritten.
 */
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const GCS_BUCKET = process.env.GCS_BUCKET || 'ngr-scraping-data';
const ROOT_DIR = path.join(__dirname);
const DATA_DIR = path.join(__dirname, 'data');
const PERU_TZ = 'America/Lima';

let _gcs;
function getGcs() {
  if (!_gcs) _gcs = new Storage();
  return _gcs;
}

function peruDateKey(iso = new Date()) {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function todayPeru() {
  return peruDateKey(new Date());
}

function gcsObject(brand, channel, date) {
  return `match_snapshots/${brand}/${channel}/${date}.json`;
}

function gcsIndex(brand, channel) {
  return `match_snapshots/${brand}/${channel}/index.json`;
}

function localDir(brand, channel) {
  return path.join(DATA_DIR, 'match_snapshots', brand, channel);
}

function localPath(brand, channel, date) {
  return path.join(localDir(brand, channel), `${date}.json`);
}

function localIndexPath(brand, channel) {
  return path.join(localDir(brand, channel), 'index.json');
}

async function readGcsJson(objectPath) {
  try {
    const [buf] = await getGcs().bucket(GCS_BUCKET).file(objectPath).download();
    return JSON.parse(buf.toString('utf8'));
  } catch (err) {
    const msg = String(err.message || '');
    // 404 = missing. 403 = ADC without read — treat as missing so callers can
    // still write locally and fall back to gcloud CLI for upload.
    if (
      err.code === 404 ||
      err.code === 403 ||
      /No such object|does not exist|Permission|denied|forbidden/i.test(msg)
    ) {
      return null;
    }
    throw err;
  }
}

async function writeGcsJson(objectPath, data) {
  const payload = JSON.stringify(data, null, 2);
  try {
    await getGcs().bucket(GCS_BUCKET).file(objectPath).save(payload, {
      contentType: 'application/json',
      resumable: false,
    });
  } catch (err) {
    const msg = String(err.message || '');
    if (!/Permission|denied|403|forbidden/i.test(msg)) throw err;
    const { execSync } = require('child_process');
    const os = require('os');
    const tmp = path.join(os.tmpdir(), `ngr-match-${Date.now()}.json`);
    fs.writeFileSync(tmp, payload);
    try {
      execSync(`gcloud storage cp "${tmp}" "gs://${GCS_BUCKET}/${objectPath}"`, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      console.warn(`[match_snapshots] wrote via gcloud CLI: gs://${GCS_BUCKET}/${objectPath}`);
    } finally {
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }
}

function writeLocal(brand, channel, date, data) {
  const dir = localDir(brand, channel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(localPath(brand, channel, date), JSON.stringify(data, null, 2));
}

function readLocal(brand, channel, date) {
  const fp = localPath(brand, channel, date);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return null; }
}

async function loadIndex(brand, channel) {
  const localIdx = localIndexPath(brand, channel);
  if (fs.existsSync(localIdx)) {
    try {
      const idx = JSON.parse(fs.readFileSync(localIdx, 'utf8'));
      if (idx?.dates) return idx;
    } catch (_) {}
  }
  const remote = await readGcsJson(gcsIndex(brand, channel));
  if (remote) {
    fs.mkdirSync(localDir(brand, channel), { recursive: true });
    fs.writeFileSync(localIdx, JSON.stringify(remote, null, 2));
    return remote;
  }
  return { brand, channel, dates: [] };
}

async function saveIndex(brand, channel, index) {
  const payload = { brand, channel, dates: index.dates || [] };
  fs.mkdirSync(localDir(brand, channel), { recursive: true });
  fs.writeFileSync(localIndexPath(brand, channel), JSON.stringify(payload, null, 2));
  await writeGcsJson(gcsIndex(brand, channel), payload);
  return payload;
}

/**
 * Persist a match result as today's (or given) snapshot.
 * Past dates: refuse to overwrite if a snapshot already exists.
 * Today: may overwrite (same-day re-run).
 *
 * @returns {{ date: string, written: boolean, reason?: string }}
 */
async function saveSnapshot(brand, channel, matchResult, date = todayPeru()) {
  if (!brand || !channel || !matchResult) {
    return { date, written: false, reason: 'missing args' };
  }
  const today = todayPeru();
  const existingLocal = readLocal(brand, channel, date);
  const existingRemote = existingLocal ? null : await readGcsJson(gcsObject(brand, channel, date));
  const exists = !!(existingLocal || existingRemote);

  if (exists && date < today) {
    console.log(`[match_snapshots] skip ${brand}/${channel}/${date} — past snapshot is immutable`);
    return { date, written: false, reason: 'immutable_past' };
  }

  const snapshot = {
    ...matchResult,
    snapshotDate: date,
    snapshotSavedAt: new Date().toISOString(),
  };

  writeLocal(brand, channel, date, snapshot);
  await writeGcsJson(gcsObject(brand, channel, date), snapshot);

  const index = await loadIndex(brand, channel);
  const entry = {
    date,
    generatedAt: matchResult.generatedAt || snapshot.snapshotSavedAt,
    rowCount: Array.isArray(matchResult.rows) ? matchResult.rows.length : 0,
  };
  index.dates = (index.dates || []).filter(d => d.date !== date);
  index.dates.push(entry);
  index.dates.sort((a, b) => (a.date < b.date ? 1 : -1));
  await saveIndex(brand, channel, index);

  console.log(`[match_snapshots] saved ${brand}/${channel}/${date} (${entry.rowCount} rows)`);
  return { date, written: true };
}

/**
 * Load a dated snapshot (local first, then GCS).
 */
async function loadSnapshot(brand, channel, date) {
  const local = readLocal(brand, channel, date);
  if (local) return local;
  const remote = await readGcsJson(gcsObject(brand, channel, date));
  if (remote) {
    writeLocal(brand, channel, date, remote);
    return remote;
  }
  return null;
}

/** List available snapshot dates (newest first). */
async function listDates(brand, channel) {
  const index = await loadIndex(brand, channel);
  return (index.dates || []).map(d => d.date);
}

module.exports = {
  peruDateKey,
  todayPeru,
  saveSnapshot,
  loadSnapshot,
  listDates,
  loadIndex,
  GCS_BUCKET,
};
