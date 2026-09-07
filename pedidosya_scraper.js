const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const { stamp } = require('./scrape_meta');
const fs = require('fs');
const path = require('path');

/**
 * PedidosYa Peru scraper
 * Uses Kernel residential Peru proxy.
 *
 * PedidosYa requires a geo context (lat/lng) before restaurant deep links work.
 * Strategy:
 *  1. Warm session with a Miraflores shoplist URL (sets location cookies)
 *  2. Open restaurant menu page
 *  3. Prefer intercepted /v2/niles/partners/{id}/menus JSON
 *  4. Fallbacks: __NEXT_DATA__, then DOM
 */

const DEFAULT_URL =
  'https://www.pedidosya.com.pe/restaurantes/lima/mcdonalds-ovalo-gutierrez-e6b6652e-45c6-44f7-8976-e376edf475a8-menu';

const GEO_WARM_URL =
  'https://www.pedidosya.com.pe/restaurantes?lat=-12.1118&lng=-77.0355&address=Ovalo%20Gutierrez%20Miraflores&city=Lima';

async function scrapePedidosYa(url = DEFAULT_URL, storeId = 'mcd-ovalo-gutierrez') {
    console.log(`Iniciando scraping de PedidosYa: ${url}`);
    console.log(`Store ID: ${storeId}`);
    console.log(`🌐 Conectando al navegador remoto en Kernel (proxy residencial Perú)...`);

    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });

    const page = await context.newPage();

    await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-PE,es;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    });

    const interceptedResponses = [];
    let menuJson = null;
    const seenPartnerIds = new Set();

    // Capture menus as soon as they land (avoids waitForResponse races / body reuse)
    page.on('response', async (response) => {
        try {
            const respUrl = response.url();
            const m = respUrl.match(/\/v2\/niles\/partners\/(\d+)\/menus/i);
            if (!m || response.status() !== 200) return;
            seenPartnerIds.add(m[1]);
            const ct = response.headers()['content-type'] || '';
            if (!ct.includes('json')) return;
            const text = await response.text();
            if (!text || text.trimStart().startsWith('<')) return;
            const json = JSON.parse(text);
            if (json?.sections?.length) {
                menuJson = json;
                console.log(`[API] Menú interceptado: ${respUrl.split('?')[0]} · sections=${json.sections.length}`);
            }
        } catch (e) {
            // Body may already be consumed by waitForResponse; that's fine
        }
    });

    try {
        console.log('[PedidosYa] Calentando sesión...');
        // Prefer homepage first — geo shoplist is more likely to trip PX after bursts
        let warmResp = await page.goto('https://www.pedidosya.com.pe/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
        console.log(`[PedidosYa] Home status: ${warmResp?.status()}`);
        await page.waitForTimeout(4000);

        warmResp = await page.goto(GEO_WARM_URL, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
        });
        console.log(`[PedidosYa] Warm status: ${warmResp?.status()} → ${page.url()}`);
        await page.waitForTimeout(3000);

        const bodyWarm = await page.evaluate(() => (document.body?.innerText || '').slice(0, 200));
        if (/acceso ha sido denegado|confirma que eres un humano/i.test(bodyWarm) || warmResp?.status() === 403) {
            throw new Error('⛔ Bloqueado por Cloudflare en warm-up.');
        }

        console.log(`[PedidosYa] Navegando al restaurante: ${url}`);

        const menuWait = page.waitForResponse(
            (r) => {
                if (r.status() !== 200 || !/\/v2\/niles\/partners\/\d+\/menus/i.test(r.url())) return false;
                const ct = r.headers()['content-type'] || '';
                return ct.includes('json');
            },
            { timeout: 50000 }
        ).catch(() => null);

        const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        const httpStatus = resp?.status();
        console.log(`[HTTP] Status: ${httpStatus} → ${page.url()}`);

        if (httpStatus === 403 || httpStatus === 451) {
            throw new Error(`⛔ Bloqueado por Cloudflare (HTTP ${httpStatus}).`);
        }

        await page.waitForFunction(
            () => /S\/\s*\d/.test(document.body?.innerText || '') || !!document.querySelector('h1'),
            { timeout: 30000 }
        ).catch(() => {});

        const menuResp = await menuWait;
        if (!menuJson && menuResp) {
            try {
                const ct = menuResp.headers()['content-type'] || '';
                if (!ct.includes('json')) {
                    console.warn(`[API] Menú natural no-JSON (${ct || 'sin content-type'})`);
                } else {
                    const json = await menuResp.json();
                    if (json?.sections) {
                        menuJson = json;
                        console.log(`[API] Menú natural: ${menuResp.url().split('?')[0]} · sections=${json.sections.length}`);
                    }
                }
            } catch (e) {
                console.warn(`[API] No se pudo leer menú natural: ${e.message}`);
            }
        }

        // Async response listener may still be parsing the body
        for (let i = 0; i < 10 && !menuJson; i++) {
            await page.waitForTimeout(500);
        }

        // If natural request missed / returned HTML, discover partner id and fetch
        if (!menuJson) {
            const partnerFromNetwork = [...seenPartnerIds][0] || null;
            const partnerId = partnerFromNetwork || await page.evaluate(() => {
                const html = document.documentElement.innerHTML;
                const patterns = [
                    /\/v2\/niles\/partners\/(\d+)\/menus/,
                    /"partnerId"\s*:\s*"?(\d{4,})"?/,
                    /"vendorId"\s*:\s*"?(\d{4,})"?/,
                    /"restaurantId"\s*:\s*"?(\d{4,})"?/,
                    /partners%2F(\d+)%2Fmenus/,
                ];
                for (const re of patterns) {
                    const m = html.match(re);
                    if (m) return m[1];
                }
                try {
                    for (const e of performance.getEntriesByType('resource')) {
                        const m = String(e.name || '').match(/\/v2\/niles\/partners\/(\d+)\/menus/i);
                        if (m) return m[1];
                    }
                } catch {}
                return null;
            }).catch(() => null);

            if (partnerId) {
                console.log(`[API] partnerId descubierto: ${partnerId}`);
                await page.waitForTimeout(3000);
                let fetched = null;
                for (let attempt = 1; attempt <= 2 && !fetched?.sections; attempt++) {
                    const result = await page.evaluate(async (pid) => {
                        try {
                            const res = await fetch(`/v2/niles/partners/${pid}/menus?occasion=DELIVERY`, {
                                credentials: 'include',
                                headers: { Accept: 'application/json' },
                            });
                            if (!res.ok) return { error: `HTTP ${res.status}` };
                            const ct = res.headers.get('content-type') || '';
                            const text = await res.text();
                            if (!ct.includes('json') || text.trimStart().startsWith('<')) {
                                return { error: `non-json (${ct}): ${text.slice(0, 80)}` };
                            }
                            return { data: JSON.parse(text) };
                        } catch (e) {
                            return { error: e.message };
                        }
                    }, partnerId).catch((e) => ({ error: e.message }));

                    if (result?.data?.sections) {
                        fetched = result.data;
                        console.log(`[API] OK fetch partner=${partnerId} attempt=${attempt} sections=${fetched.sections.length}`);
                    } else {
                        console.warn(`[API] fetch attempt ${attempt} falló: ${result?.error || 'sin sections'}`);
                        await page.waitForTimeout(4000 * attempt);
                    }
                }
                if (fetched?.sections) menuJson = fetched;
            } else {
                console.warn('[API] No se encontró partnerId en la página');
            }
        }

        // Soft reload retry — often clears a one-shot HTML menus block
        if (!menuJson) {
            console.log('[API] Reintento con reload + cooldown…');
            await page.waitForTimeout(12000);
            await page.goto('https://www.pedidosya.com.pe/', {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            }).catch(() => {});
            await page.waitForTimeout(5000);
            await page.goto(GEO_WARM_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 60000,
            }).catch(() => {});
            await page.waitForTimeout(4000);

            const menuWait2 = page.waitForResponse(
                (r) => {
                    if (r.status() !== 200 || !/\/v2\/niles\/partners\/\d+\/menus/i.test(r.url())) return false;
                    return (r.headers()['content-type'] || '').includes('json');
                },
                { timeout: 55000 }
            ).catch(() => null);

            const resp2 = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
            console.log(`[HTTP] Retry status: ${resp2?.status()} → ${page.url()}`);
            await page.waitForTimeout(4000);
            const menuResp2 = await menuWait2;
            if (!menuJson && menuResp2) {
                try {
                    const json = await menuResp2.json();
                    if (json?.sections) {
                        menuJson = json;
                        console.log(`[API] Menú retry: sections=${json.sections.length}`);
                    }
                } catch (e) {
                    console.warn(`[API] Retry parse falló: ${e.message}`);
                }
            }
            for (let i = 0; i < 12 && !menuJson; i++) {
                await page.waitForTimeout(500);
            }
        }

        if (menuJson) {
            interceptedResponses.push({ url: `menus:/v2/niles/partners/menus`, data: menuJson });
        }

        // Prefer visible H1 over API "Menú de …" label
        const pageTitle = cleanRestaurantName(await page.evaluate(() => {
            const h1 = document.querySelector('h1');
            return (h1?.textContent || '').trim();
        }));

        await page.waitForTimeout(500);

        let products = [];
        let restaurantName = pageTitle || storeId;

        // Strategy 1: intercepted menus API (preferred)
        const menuResponses = interceptedResponses.filter(r => /\/menus/.test(r.url) || r.data?.sections);
        if (menuResponses.length > 0) {
            console.log(`[API] Analizando ${menuResponses.length} respuestas de menú...`);
            for (const { url: apiUrl, data } of menuResponses) {
                const result = extractFromApiData(data);
                if (result.products.length > 0) {
                    products = result.products;
                    restaurantName = pageTitle || cleanRestaurantName(result.restaurantName) || restaurantName;
                    console.log(`[API] Extraídos ${products.length} productos desde: ${apiUrl.split('?')[0]}`);
                    break;
                }
            }
        }

        // Strategy 2: __NEXT_DATA__
        if (products.length === 0) {
            console.log('[PedidosYa] Buscando __NEXT_DATA__...');
            const nextDataRaw = await page.evaluate(() => {
                const el = document.getElementById('__NEXT_DATA__');
                return el ? el.textContent : null;
            });
            if (nextDataRaw) {
                try {
                    const nextData = JSON.parse(nextDataRaw);
                    const result = extractFromNextData(nextData);
                    products = result.products;
                    restaurantName = pageTitle || cleanRestaurantName(result.restaurantName) || restaurantName;
                    console.log(`[__NEXT_DATA__] Extraídos ${products.length} productos`);
                } catch (e) {
                    console.warn(`[__NEXT_DATA__] Error parseando: ${e.message}`);
                }
            }
        }

        // Strategy 3: remaining intercepted JSON
        if (products.length === 0 && interceptedResponses.length > 0) {
            for (const { url: apiUrl, data } of interceptedResponses) {
                const result = extractFromApiData(data);
                if (result.products.length > 0) {
                    products = result.products;
                    restaurantName = pageTitle || cleanRestaurantName(result.restaurantName) || restaurantName;
                    console.log(`[API] Extraídos ${products.length} productos desde: ${apiUrl.split('?')[0]}`);
                    break;
                }
            }
        }

        // Strategy 4: DOM (scroll to hydrate lazy sections)
        if (products.length === 0) {
            console.log('[DOM] Intentando extracción desde DOM...');
            await page.evaluate(async () => {
                const sleep = (ms) => new Promise(r => setTimeout(r, ms));
                for (let y = 0; y <= 8000; y += 900) {
                    window.scrollTo(0, y);
                    await sleep(350);
                }
                window.scrollTo(0, 0);
                await sleep(500);
            }).catch(() => {});
            products = await extractFromDom(page);
            console.log(`[DOM] Extraídos ${products.length} productos`);
        }

        if (products.length === 0) {
            if (interceptedResponses.length > 0) {
                const sample = JSON.stringify(interceptedResponses[0].data).slice(0, 500);
                console.error(`[DEBUG] Primera respuesta interceptada: ${sample}`);
            }
            throw new Error('No se pudo extraer productos de PedidosYa. Ver logs para debug.');
        }

        // Drop zero-price rows unless they are the only signal (usually incomplete options)
        const withPrice = products.filter(p => p.price > 0);
        if (withPrice.length > 0) products = withPrice;

        restaurantName = pageTitle || cleanRestaurantName(restaurantName) || restaurantName;
        products = products.map(p => ({
            ...p,
            restaurant: restaurantName,
            description: (p.description || '').trim(),
        }));

        const catCounts = {};
        products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
        console.log(`✅ ${products.length} productos · categorías: ${Object.entries(catCounts).map(([k, v]) => `${k}(${v})`).join(', ')}`);
        saveData(products, storeId);

    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    } finally {
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
    }
}

function extractFromNextData(nextData) {
    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) return { products: [], restaurantName: '' };

    console.log(`[__NEXT_DATA__] pageProps keys: ${Object.keys(pageProps).join(', ')}`);

    const restaurant = pageProps.restaurant
        || pageProps.restaurantDetailInfo
        || pageProps.data?.restaurant
        || pageProps.initialData?.restaurant;

    if (restaurant) {
        const name = restaurant.name || restaurant.basicData?.name || '';
        const sections = restaurant.menuSections
            || restaurant.sections
            || restaurant.menu?.sections
            || restaurant.menu?.items
            || [];
        const products = flattenSections(sections, name);
        if (products.length > 0) return { products, restaurantName: name };
    }

    const sections = pageProps.sections || pageProps.menuSections || pageProps.menu?.sections;
    if (sections) {
        const name = pageProps.restaurantName || pageProps.name || '';
        return { products: flattenSections(sections, name), restaurantName: name };
    }

    const found = deepFind(pageProps, 'sections');
    if (found && Array.isArray(found)) {
        const products = flattenSections(found, '');
        if (products.length > 0) return { products, restaurantName: '' };
    }

    return { products: [], restaurantName: '' };
}

function cleanRestaurantName(name) {
    if (!name) return '';
    return String(name)
        .replace(/^men[uú]\s+de\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractFromApiData(data) {
    if (!data || typeof data !== 'object') return { products: [], restaurantName: '' };

    const name = cleanRestaurantName(
        data.name || data.restaurantName || data.restaurant?.name || ''
    );

    const sections = data.sections || data.menuSections
        || data.data?.sections || data.restaurant?.sections
        || data.menu?.sections || data.result?.sections;

    if (sections && Array.isArray(sections)) {
        return { products: flattenSections(sections, name), restaurantName: name };
    }

    const items = data.items || data.products || data.data?.items;
    if (items && Array.isArray(items) && items.length > 0 && items[0].name) {
        return { products: itemsToProducts(items, 'General', name), restaurantName: name };
    }

    return { products: [], restaurantName: '' };
}

function flattenSections(sections, restaurantName) {
    const products = [];
    for (const section of (sections || [])) {
        const category = section.name || section.title || 'General';
        const items = section.products || section.items || section.menuItems || [];
        products.push(...itemsToProducts(items, category, restaurantName));
    }
    return products;
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

async function extractFromDom(page) {
    return page.evaluate(() => {
        const restName = (document.querySelector('h1')?.textContent || '').trim()
            .replace(/^men[uú]\s+de\s+/i, '');
        const items = [];
        const seen = new Set();

        const parsePrice = (text) => {
            const m = String(text || '').match(/S\/\s*(\d+(?:[.,]\d+)?)/);
            if (!m) return 0;
            return parseFloat(m[1].replace(',', '.')) || 0;
        };

        const categoryFor = (el) => {
            let node = el;
            for (let i = 0; i < 8 && node; i++) {
                let sib = node.previousElementSibling;
                while (sib) {
                    const t = (sib.textContent || '').trim().replace(/\s+/g, ' ');
                    if (t && t.length < 60 && !/S\/\s*\d/.test(t) && !/leer m[aá]s/i.test(t)) {
                        const tag = sib.tagName;
                        if (/^H[1-6]$/.test(tag) || sib.getAttribute('role') === 'heading') {
                            return t;
                        }
                    }
                    sib = sib.previousElementSibling;
                }
                node = node.parentElement;
            }
            return 'General';
        };

        const descNodes = [...document.querySelectorAll('[data-testid="read-more-container"]')];
        for (const descEl of descNodes) {
            let card = descEl.parentElement;
            let best = null;
            for (let depth = 0; depth < 6 && card; depth++) {
                const text = (card.innerText || '').trim();
                if (/S\/\s*\d/.test(text) && text.length < 500) {
                    best = card;
                    break;
                }
                card = card.parentElement;
            }
            if (!best) continue;

            const lines = (best.innerText || '')
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean)
                .filter(s => !/^m[aá]s vendido$/i.test(s) && !/%\s*off$/i.test(s));

            const priceLine = [...lines].reverse().find(l => /S\/\s*\d/.test(l));
            if (!priceLine) continue;
            const price = parsePrice(priceLine);
            if (!price) continue;

            const name = lines.find(l => l !== priceLine && !/leer m[aá]s/i.test(l) && l.length > 1) || '';
            if (!name) continue;

            let description = (descEl.textContent || '').trim()
                .replace(/\s*leer m[aá]s\s*$/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            const fullAttr = descEl.getAttribute('title') || descEl.getAttribute('aria-label') || '';
            if (fullAttr && fullAttr.length > description.length) description = fullAttr.trim();

            const key = `${name}||${price}`;
            if (seen.has(key)) continue;
            seen.add(key);

            items.push({
                restaurant: restName,
                category: categoryFor(best),
                name,
                description,
                price,
                inStock: true,
            });
        }

        if (items.length === 0) {
            const cards = [...document.querySelectorAll('div')].filter(el => {
                if (el.children.length < 2 || el.children.length > 5) return false;
                const t = (el.innerText || '').trim();
                if (t.length < 12 || t.length > 420) return false;
                return /S\/\s*\d/.test(t);
            });
            for (const el of cards) {
                const lines = el.innerText.split('\n').map(s => s.trim()).filter(Boolean);
                const priceLine = [...lines].reverse().find(l => /S\/\s*\d/.test(l));
                if (!priceLine) continue;
                const price = parsePrice(priceLine);
                const name = lines[0];
                const description = lines.slice(1).find(l => l !== priceLine && !/S\/\s*\d/.test(l)) || '';
                if (!name || !price) continue;
                const key = `${name}||${price}`;
                if (seen.has(key)) continue;
                seen.add(key);
                items.push({
                    restaurant: restName,
                    category: categoryFor(el),
                    name,
                    description,
                    price,
                    inStock: true,
                });
            }
        }

        return items;
    });
}

function deepFind(obj, key, depth = 0) {
    if (depth > 6 || !obj || typeof obj !== 'object') return null;
    if (key in obj) return obj[key];
    for (const v of Object.values(obj)) {
        const result = deepFind(v, key, depth + 1);
        if (result) return result;
    }
    return null;
}

function saveData(products, storeId) {
    const jsonPath = path.join(__dirname, `products_${storeId}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2));
    stamp(storeId);
    console.log(`✅ Guardado: ${jsonPath} (${products.length} productos)`);
}

module.exports = { scrapePedidosYa, DEFAULT_URL };

if (require.main === module) {
    const targetUrl = process.argv[2] || DEFAULT_URL;
    const targetStoreId = process.argv[3] || 'mcd-ovalo-gutierrez';
    scrapePedidosYa(targetUrl, targetStoreId);
}
