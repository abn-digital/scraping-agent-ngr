/**
 * Freshness sentinel for Scraping Agent catalogs.
 * Mirrors ticketSentinel anti-spam: re-alert every 60 min while stale; notify on recovery.
 */
const { Storage } = require('@google-cloud/storage');

const REALERT_MS = 60 * 60 * 1000;
const STALE_MS = 36 * 60 * 60 * 1000;
const STATE_FILE = 'health/scrape-sentinel-state.json';
const CONSOLE_JOB =
  'https://console.cloud.google.com/run/jobs/details/us-central1/scraping-scheduled-refresh?project=hike-agentic-playground';
const DASHBOARD_URL = 'https://scraping-agent-ngr-966549276703.us-central1.run.app';

function hoursLabel(ms) {
  const h = Math.max(0, Math.round(ms / (60 * 60 * 1000)));
  return `${h}h`;
}

function formatPeru(isoOrMs) {
  const d = typeof isoOrMs === 'number' ? new Date(isoOrMs) : new Date(isoOrMs);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function newestFromMeta(meta) {
  let newestMs = 0;
  let newestId = null;
  if (!meta || typeof meta !== 'object') return { newestMs, newestId };
  for (const [id, raw] of Object.entries(meta)) {
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) continue;
    if (t > newestMs) {
      newestMs = t;
      newestId = id;
    }
  }
  return { newestMs, newestId };
}

function decideNotifications({ stale, previousOpen, nowMs, force, detail }) {
  const prev = previousOpen && typeof previousOpen === 'object' ? previousOpen : {};
  const key = 'scrape-stale';
  const nextOpen = {};
  let fresh = false;
  let still = false;
  let recovered = false;

  if (stale) {
    const prior = prev[key];
    const last = prior && prior.lastAlertAt ? Date.parse(prior.lastAlertAt) : 0;
    const due = force || !last || nowMs - last >= REALERT_MS;
    if (due) {
      if (last) still = true;
      else fresh = true;
      nextOpen[key] = { lastAlertAt: new Date(nowMs).toISOString(), text: detail };
    } else {
      nextOpen[key] = { lastAlertAt: prior.lastAlertAt, text: prior.text || detail };
    }
  } else if (prev[key]) {
    recovered = true;
  }

  return {
    notify: fresh || still || recovered,
    fresh,
    still,
    recovered,
    nextOpen,
    detail,
  };
}

/**
 * Slack incoming-webhook payload with colored attachment (same pattern as NGR Shares).
 */
function formatSlackPayload({ fresh, still, recovered, newestId, newestMs, ageMs }) {
  const age = hoursLabel(Number.isFinite(ageMs) ? ageMs : 0);
  const lastWhen = newestMs ? formatPeru(newestMs) : 'sin datos';

  if (fresh || still) {
    const title = still && !fresh
      ? 'Catálogos de precios siguen sin actualizarse'
      : 'Catálogos de precios sin actualizar';
    const textFallback = `Scraping Agent: ${title} (hace ${age})`;
    return {
      text: textFallback,
      attachments: [
        {
          color: '#F04438',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🚨 *${title}*`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  'El batch diario de Rappi/Propio no está dejando data fresca en GCS. ' +
                  'El dashboard puede estar mostrando precios viejos.',
              },
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*Último update*\n${lastWhen} (Lima)` },
                { type: 'mrkdwn', text: `*Antigüedad*\n${age} _(umbral 36h)_` },
                { type: 'mrkdwn', text: `*Última tienda*\n\`${newestId || '—'}\`` },
                { type: 'mrkdwn', text: '*Qué revisar*\nJob Cloud Run · Kernel billing · imagen Docker' },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Ver job de scrape' },
                  url: CONSOLE_JOB,
                  style: 'danger',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Abrir dashboard' },
                  url: DASHBOARD_URL,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'Sentinela Scraping Agent · check cada 1h · re-alerta cada 60 min',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  if (recovered) {
    return {
      text: 'Scraping Agent: catálogos recuperados',
      attachments: [
        {
          color: '#12B76A',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '✅ *Catálogos de precios recuperados*',
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `\`scrape_meta\` volvió a actualizarse. Último stamp: *${lastWhen}* (\`${newestId || '—'}\`).`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: 'Abrir dashboard' },
                  url: DASHBOARD_URL,
                  style: 'primary',
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'Sentinela Scraping Agent · check cada 1h',
                },
              ],
            },
          ],
        },
      ],
    };
  }

  return { text: 'Scraping Agent sentinel' };
}

function formatMetaReadErrorPayload(errMessage) {
  return {
    text: 'Scraping Agent: no pude leer scrape_meta.json',
    attachments: [
      {
        color: '#F04438',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '🚨 *No pude leer `scrape_meta.json`*',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `La sentinela no pudo chequear frescura.\n\`${errMessage}\``,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Ver job de scrape' },
                url: CONSOLE_JOB,
                style: 'danger',
              },
            ],
          },
        ],
      },
    ],
  };
}

async function readState(file) {
  try {
    const [buf] = await file.download();
    const parsed = JSON.parse(buf.toString('utf8'));
    return {
      open: parsed && parsed.open && typeof parsed.open === 'object' ? parsed.open : {},
      force: false,
    };
  } catch (err) {
    if (err && (err.code === 404 || err.code === 4040)) return { open: {}, force: false };
    return {
      open: {},
      force: true,
      problem: 'No pude leer el estado de dedup en GCS.',
    };
  }
}

async function postSlack(fetchImpl, webhookUrl, payload) {
  const body = typeof payload === 'string' ? { text: payload } : payload;
  const res = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = new Error('Slack respondió HTTP ' + res.status);
    error.status = res.status;
    throw error;
  }
}

/**
 * @param {object} opts
 * @param {import('@google-cloud/storage').Storage} [opts.storage]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {number} [opts.nowMs]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {boolean} [opts.forceNotify] force Slack even if not due / not stale (smoke test)
 * @param {boolean} [opts.forceStale] treat as stale for smoke tests
 */
async function runScrapeSentinel({
  storage = new Storage(),
  fetchImpl = globalThis.fetch,
  nowMs = Date.now(),
  env = process.env,
  forceNotify = false,
  forceStale = false,
} = {}) {
  const bucketName = env.GCS_BUCKET || 'ngr-scraping-data';
  const bucket = storage.bucket(bucketName);
  const stateFile = bucket.file(STATE_FILE);

  let meta = {};
  try {
    const [buf] = await bucket.file('scrape_meta.json').download();
    meta = JSON.parse(buf.toString('utf8'));
  } catch (err) {
    const webhookUrl = env.NGR_ALARMAS_SLACK_WEBHOOK || '';
    if (!webhookUrl) throw new Error('NGR_ALARMAS_SLACK_WEBHOOK no está configurada');
    await postSlack(
      fetchImpl,
      webhookUrl,
      formatMetaReadErrorPayload(err && err.message ? err.message : String(err)),
    );
    return { ok: false, notified: true, stale: true, error: 'meta_read_failed' };
  }

  const { newestMs, newestId } = newestFromMeta(meta);
  const ageMs = newestMs ? nowMs - newestMs : Number.POSITIVE_INFINITY;
  const stale = forceStale || !newestMs || ageMs > STALE_MS;
  const detail = !newestMs
    ? 'scrape_meta sin timestamps válidos'
    : `Sin updates en scrape_meta hace ${hoursLabel(ageMs)} (umbral 36h)`;

  const state = await readState(stateFile);
  let decision = decideNotifications({
    stale,
    previousOpen: state.open,
    nowMs,
    force: forceNotify || state.force === true,
    detail: state.problem ? `${detail}. ${state.problem}` : detail,
  });

  if (forceNotify && !decision.notify) {
    decision = {
      ...decision,
      notify: true,
      fresh: stale,
      still: false,
      recovered: !stale,
    };
  }

  if (decision.notify) {
    const webhookUrl = env.NGR_ALARMAS_SLACK_WEBHOOK || '';
    if (!webhookUrl) {
      const error = new Error('NGR_ALARMAS_SLACK_WEBHOOK no está configurada');
      error.code = 'SLACK_NOT_CONFIGURED';
      throw error;
    }
    await postSlack(
      fetchImpl,
      webhookUrl,
      formatSlackPayload({
        fresh: decision.fresh,
        still: decision.still,
        recovered: decision.recovered,
        newestId,
        newestMs,
        ageMs: Number.isFinite(ageMs) ? ageMs : 0,
      }),
    );
  }

  let stateWriteOk = true;
  try {
    await stateFile.save(JSON.stringify({ open: decision.nextOpen }, null, 2) + '\n', {
      contentType: 'application/json',
      resumable: false,
    });
  } catch {
    stateWriteOk = false;
  }

  return {
    ok: !stale,
    notified: decision.notify,
    stale,
    newestId,
    newestAt: newestMs ? new Date(newestMs).toISOString() : null,
    ageHours: Number.isFinite(ageMs) ? Math.round(ageMs / (60 * 60 * 1000)) : null,
    stateWriteOk,
  };
}

module.exports = {
  REALERT_MS,
  STALE_MS,
  newestFromMeta,
  decideNotifications,
  formatSlackPayload,
  runScrapeSentinel,
};
