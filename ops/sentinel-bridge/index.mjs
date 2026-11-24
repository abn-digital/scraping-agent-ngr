import http from 'http';
import crypto from 'crypto';

const port = Number(process.env.PORT || 8080);
const bridgeToken = process.env.BRIDGE_TOKEN || '';
const webhookUrl = process.env.NGR_ALARMAS_SLACK_WEBHOOK || '';

const CONSOLE_JOB =
  'https://console.cloud.google.com/run/jobs/details/us-central1/scraping-scheduled-refresh?project=hike-agentic-playground';
const DASHBOARD_URL = 'https://scraping-agent-ngr-966549276703.us-central1.run.app';

function tokenMatches(header, expected) {
    if (!header || !expected) return false;
    const left = Buffer.from(String(header));
    const right = Buffer.from(String(expected));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

export function incidentPayload(body) {
    const incident = body && body.incident ? body.incident : {};
    const closed = incident.state === 'closed';
    const policy = String(incident.policy_name || '');
    const summary = incident.summary || policy || 'alerta NGR';

    if (/ticket-sentinel/i.test(policy) || /ticket-sentinel/i.test(summary)) {
        const headline = closed
            ? 'Scheduler de la sentinela de tickets: recuperado'
            : 'Scheduler de la sentinela de tickets falló';
        return { text: headline + '\n' + summary };
    }

    if (/scraping-scheduled|scraping.agent|scrape/i.test(policy) || /scraping/i.test(summary)) {
        if (closed) {
            return {
                text: 'Scraping Agent: job recuperado',
                attachments: [
                    {
                        color: '#12B76A',
                        blocks: [
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: '✅ *Job de scrape recuperado*',
                                },
                            },
                            {
                                type: 'section',
                                text: {
                                    type: 'mrkdwn',
                                    text: summary,
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
                        ],
                    },
                ],
            };
        }
        return {
            text: 'Scraping Agent: job falló dos veces',
            attachments: [
                {
                    color: '#F04438',
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '🚨 *Job `scraping-scheduled-refresh` falló 2 veces en 24h*',
                            },
                        },
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text:
                                    'El batch AM/PM no está completando. Suele ser imagen Docker borrada, Kernel sin crédito, o el job crasheando al arrancar.\n\n' +
                                    `_${summary}_`,
                            },
                        },
                        {
                            type: 'actions',
                            elements: [
                                {
                                    type: 'button',
                                    text: { type: 'plain_text', text: 'Ver job' },
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
                    ],
                },
            ],
        };
    }

    const headline = closed ? 'Recuperado: ' + summary : 'Alerta: ' + summary;
    return { text: headline };
}

/** @deprecated use incidentPayload */
export function incidentText(body) {
    const p = incidentPayload(body);
    return p.text;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
    }
    if (req.method !== 'POST' || url.pathname !== '/hook') {
        res.writeHead(404);
        res.end();
        return;
    }
    if (!tokenMatches(url.searchParams.get('token'), bridgeToken)) {
        res.writeHead(401);
        res.end('unauthorized');
        return;
    }
    if (!webhookUrl) {
        res.writeHead(500);
        res.end('slack not configured');
        return;
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    let body = {};
    try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
        body = {};
    }

    const slack = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentPayload(body)),
    });
    if (!slack.ok) {
        res.writeHead(502);
        res.end('slack');
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
});

server.listen(port);
