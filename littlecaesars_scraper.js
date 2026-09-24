const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const fs = require('fs');
const path = require('path');

/**
 * Little Caesars Peru scraper — pe.littlecaesars.com/es-pe/menu/
 * React/Next app. Intercepts menu APIs, falls back to __NEXT_DATA__ and DOM.
 */
async function scrapeLittleCaesars(url = 'https://pe.littlecaesars.com/es-pe/menu/') {
    console.log(`Iniciando scraping de Little Caesars: ${url}`);
    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });

    const page = await context.newPage();
    let results = [];
    const apiPayloads = [];

    page.on('response', async (res) => {
        const resUrl = res.url();
        if (!/menu|product|catalog|category/i.test(resUrl)) return;
        if (!/\.json|\/api\/|graphql|gateway/i.test(resUrl) && !resUrl.includes('littlecaesars')) return;
        try {
            const ct = res.headers()['content-type'] || '';
            if (!ct.includes('json') && !ct.includes('javascript')) return;
            const json = await res.json();
            if (json && typeof json === 'object') {
                apiPayloads.push(json);
            }
        } catch (_) {}
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForTimeout(4000);

        // Dismiss age / cookie / location gates
        await dismissGates(page);
        await page.waitForTimeout(2000);
        await autoScroll(page);
        await page.waitForTimeout(2000);

        // 1) API payloads intercepted during load
        for (const payload of apiPayloads) {
            const fromApi = walkProducts(payload);
            if (fromApi.length > results.length) {
                console.log(`API payload: ${fromApi.length} productos`);
                results = fromApi;
            }
        }

        // 2) __NEXT_DATA__
        if (results.length < 3) {
            const nextData = await page.evaluate(() => {
                const script = document.getElementById('__NEXT_DATA__');
                return script ? JSON.parse(script.textContent) : null;
            });
            if (nextData) {
                console.log('Encontrado __NEXT_DATA__, extrayendo...');
                results = walkProducts(nextData);
            }
        }

        // Prefer DOM for LC — API/__NEXT_DATA__ are sparse; menu is client-rendered cards
        console.log('Extrayendo desde DOM...');
        await autoScroll(page);
        await page.waitForTimeout(1500);
        const domProducts = await extractLCProducts(page, null);
        console.log(`DOM: ${domProducts.length} productos`);
        if (domProducts.length > results.length) results = domProducts;

        // If still thin, try walking category anchors / hash links
        if (results.length < 5) {
            const links = await page.$$eval('a[href*="menu"], nav a', as =>
                as.map(a => ({ href: a.href, text: (a.textContent || '').trim() }))
                    .filter(l => l.href && l.text && l.text.length < 40)
            );
            console.log(`Links menú: ${links.length}`);
        }

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
    }

    return saveUnique(results, 'littlecaesars-pe');
}

async function dismissGates(page) {
    for (const sel of [
        'button:has-text("Aceptar")', 'button:has-text("Accept")', 'button:has-text("Entendido")',
        'button:has-text("Sí")', 'button:has-text("Continuar")', 'button:has-text("Cerrar")',
        'button:has-text("Ordenar")', 'button:has-text("Order")', '[aria-label="Close"]',
        '[aria-label="Cerrar"]', '.modal-close', '#onetrust-accept-btn-handler',
    ]) {
        try {
            const btn = await page.$(sel);
            if (btn) { await btn.click(); await page.waitForTimeout(500); }
        } catch (_) {}
    }
}

function walkProducts(obj, category = 'General', results = []) {
    if (!obj || typeof obj !== 'object') return results;
    if (Array.isArray(obj)) {
        obj.forEach(item => walkProducts(item, category, results));
        return results;
    }

    const name = obj.name || obj.title || obj.productName;
    const priceRaw = obj.price ?? obj.basePrice ?? obj.unitPrice ?? obj.amount ?? obj.productPrice;
    if (name && priceRaw !== undefined && typeof name === 'string') {
        let price = typeof priceRaw === 'number'
            ? (priceRaw > 1000 ? priceRaw / 100 : priceRaw)
            : parseFloat(String(priceRaw).replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
        if (price > 0 && name.length > 1 && name.length < 120) {
            results.push({
                restaurant: 'Little Caesars',
                category: obj.categoryName || obj.category || category || 'General',
                name,
                description: obj.description || obj.shortDescription || '',
                price,
            });
            return results;
        }
    }

    const catName = typeof (obj.categoryName ?? obj.category ?? obj.name) === 'string'
        ? (obj.categoryName ?? obj.category ?? obj.name)
        : category;
    // Only treat as category context if it looks like a section (has nested products)
    const nextCat = (obj.products || obj.items || obj.menuItems) ? (obj.name || obj.title || catName) : category;
    Object.values(obj).forEach(v => walkProducts(v, typeof nextCat === 'string' ? nextCat : category, results));
    return results;
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const timer = setInterval(() => {
                window.scrollBy(0, 400);
                y += 400;
                if (y >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
            }, 300);
        });
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
}

async function extractLCProducts(page, forcedCategory) {
    return page.evaluate((forcedCat) => {
        const results = [];
        const seen = new Set();

        // Prefer leaf-ish cards that include BOTH a price and a product name.
        // Price-only child divs ("S/ 26.90") used to win the mid-level filter and
        // drop siblings like DÚO!DÚO! / SUPER CHEESE.
        const cards = [...document.querySelectorAll('div, a, article')].filter(el => {
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (t.length < 12 || t.length > 280) return false;
            if (!/S\/\s*[\d.,]+/.test(t)) return false;
            // Must have more than just the price
            const withoutPrice = t.replace(/S\/\s*[\d.,]+/g, '').trim();
            if (withoutPrice.length < 3) return false;
            // Prefer compact cards: no nested card that also has price+name
            const nested = [...el.querySelectorAll('div, a, article')].some(child => {
                if (child === el) return false;
                const ct = (child.textContent || '').replace(/\s+/g, ' ').trim();
                if (ct.length < 12 || ct.length > 280) return false;
                if (!/S\/\s*[\d.,]+/.test(ct)) return false;
                return ct.replace(/S\/\s*[\d.,]+/g, '').trim().length >= 3;
            });
            return !nested;
        });

        for (const el of cards) {
            const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
            const priceMatch = raw.match(/S\/\s*([\d.,]+)/);
            if (!priceMatch) continue;
            const price = parseFloat(priceMatch[1].replace(',', '.'));
            if (!price || price <= 0) continue;

            let rest = raw
                .replace(priceMatch[0], ' ')
                .replace(/\s+/g, ' ')
                .trim();

            let category = forcedCat || 'Pizzas';
            if (/Hot-N-Ready®?/i.test(rest)) {
                category = 'Hot-N-Ready';
                rest = rest.replace(/Hot-N-Ready®?\s*/i, '').trim();
            }

            // Cut description: glued lowercase OR Capital description after bang-titles
            let productName = rest;
            const bang = rest.match(/^(D[UÚ]O!\s*D[UÚ]O!|EXTRA!\s*EXTRA!)/i);
            if (bang) {
                productName = bang[1].replace(/\s+/g, ' ').trim();
            } else {
                productName = rest
                    .replace(/\d+\s*Piezas.*$/i, '')
                    // Only split camelGlue on letter→Letter (never after !)
                    .replace(/(?<=[a-záéíóúñ])(?=[A-ZÁÉÍÓÚÑ])/g, '\n')
                    .split('\n')[0]
                    .trim();
            }

            if (!productName || productName.length < 2) continue;
            if (/^S\//i.test(productName)) continue;

            const key = productName.toLowerCase();
            if (seen.has(key)) continue;

            // Description = leftover after name when present
            let description = '';
            const after = rest.slice(rest.toLowerCase().indexOf(productName.toLowerCase()) + productName.length).trim();
            if (after && after.length > 3 && after.length < 200) description = after;

            results.push({
                restaurant: 'Little Caesars',
                category,
                name: productName,
                description,
                price,
            });
            seen.add(key);
        }

        return results;
    }, forcedCategory || null);
}

function saveUnique(results, storeId) {
    const seen = new Set();
    const unique = results.filter(p => {
        const key = `${p.name}||${p.category || ''}`;
        if (!p.name || seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    console.log(`\nTotal de productos únicos extraídos: ${unique.length}`);
    if (unique.length > 0) {
        fs.writeFileSync(path.join(__dirname, `products_${storeId}.json`), JSON.stringify(unique, null, 2));
        const header = 'Restaurant,Category,Product Name,Description,Price';
        const rows = unique.map(p => [esc(p.restaurant), esc(p.category), esc(p.name), esc(p.description), p.price].join(','));
        fs.writeFileSync(path.join(__dirname, `products_${storeId}.csv`), [header, ...rows].join('\n'));
        console.log(`Guardado: products_${storeId}.json / .csv`);
    } else {
        console.error('No se extrajo ningún producto.');
        process.exit(1);
    }
    return unique;
}

function esc(str) {
    if (!str) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
}

const targetUrl = process.argv[2] || 'https://pe.littlecaesars.com/es-pe/menu/';
scrapeLittleCaesars(targetUrl);
