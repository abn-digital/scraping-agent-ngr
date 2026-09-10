/**
 * Append-only scrape history in GCS.
 *
 * Layout:
 *   history/<storeId>/index.json
 *   history/<storeId>/runs/<ISO-safe>.json
 *
 * Latest catalogs stay at products_<storeId>.json — this module never overwrites them.
 * Failures here must not fail the scrape; callers should catch/log.
 */
const { Storage } = require('@google-cloud/storage');

const GCS_BUCKET = process.env.GCS_BUCKET || 'ngr-scraping-data';

let _gcs;
function getGcs() {
    if (!_gcs) _gcs = new Storage();
    return _gcs;
}

function bucket() {
    return getGcs().bucket(GCS_BUCKET);
}

/** Object-safe run id: ISO with ':' → '-' */
function toRunId(at) {
    return String(at).replace(/:/g, '-');
}

function fromRunId(runId) {
    // 2026-09-10T21-28-46.012Z → 2026-09-10T21:28:46.012Z
    const s = String(runId);
    const m = s.match(/^(\d{4}-\d{2}-\d{2}T)(\d{2})-(\d{2})-(\d{2}(?:\.\d+)?)(Z)$/);
    if (m) return `${m[1]}${m[2]}:${m[3]}:${m[4]}${m[5]}`;
    return s.replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
}

function indexPath(storeId) {
    return `history/${storeId}/index.json`;
}

function runPath(storeId, at) {
    return `history/${storeId}/runs/${toRunId(at)}.json`;
}

async function readJson(objectPath) {
    try {
        const [buf] = await bucket().file(objectPath).download();
        return JSON.parse(buf.toString('utf8'));
    } catch (err) {
        // Missing object, or caller lacks get on a not-yet-created path
        if (err.code === 404 || err.code === 'ENOENT') return null;
        const msg = String(err.message || '');
        if (/No such object|does not exist|404/i.test(msg)) return null;
        throw err;
    }
}

async function writeJson(objectPath, data) {
    const file = bucket().file(objectPath);
    await file.save(JSON.stringify(data, null, 2), {
        contentType: 'application/json',
        resumable: false,
    });
}

/**
 * Append a scrape run. Does not touch products_<id>.json.
 * @returns {{ at: string, productCount: number } | null}
 */
async function appendRun({ storeId, scrapedAt, products }) {
    if (!storeId || !Array.isArray(products)) return null;
    const at = scrapedAt || new Date().toISOString();
    const productCount = products.length;

    await writeJson(runPath(storeId, at), products);

    let index = await readJson(indexPath(storeId));
    if (!index || typeof index !== 'object') {
        index = { storeId, runs: [] };
    }
    if (!Array.isArray(index.runs)) index.runs = [];

    const exists = index.runs.some(r => r && r.at === at);
    if (!exists) {
        index.runs.push({ at, productCount });
        index.runs.sort((a, b) => new Date(b.at) - new Date(a.at));
    } else {
        index.runs = index.runs.map(r => (r.at === at ? { at, productCount } : r));
    }
    index.storeId = storeId;
    await writeJson(indexPath(storeId), index);

    console.log(`[history] ${storeId} @ ${at} (${productCount} products)`);
    return { at, productCount };
}

async function getIndex(storeId) {
    const index = await readJson(indexPath(storeId));
    if (!index) return { storeId, runs: [] };
    return {
        storeId: index.storeId || storeId,
        runs: Array.isArray(index.runs) ? index.runs : [],
    };
}

async function getRun(storeId, at) {
    if (!storeId || !at) return null;
    const products = await readJson(runPath(storeId, at));
    if (!products) return null;
    return { storeId, at, products };
}

module.exports = {
    GCS_BUCKET,
    appendRun,
    getIndex,
    getRun,
    toRunId,
    fromRunId,
    indexPath,
    runPath,
};
