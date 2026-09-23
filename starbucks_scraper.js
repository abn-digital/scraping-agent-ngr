const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const fs = require('fs');
const path = require('path');

/**
 * Starbucks Peru scraper — starbucks.pe/menu
 * Starbucks uses a React SPA with JSON-LD or embedded product data.
 * Always takes the CURRENT price, not promotional crossed-out prices.
 */
async function scrapeStarbucks(url = 'https://www.starbucks.pe/menu') {
    console.log(`Iniciando scraping de Starbucks Peru: ${url}`);
    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });

    const page = await context.newPage();
    let results = [];

    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(3000);
        await autoScroll(page);

        // Try __NEXT_DATA__ or window.__INITIAL_STATE__
        const embedded = await page.evaluate(() => {
            const nextScript = document.getElementById('__NEXT_DATA__');
            if (nextScript) {
                try { return { type: 'next', data: JSON.parse(nextScript.textContent) }; } catch (_) {}
            }
            if (window.__INITIAL_STATE__) return { type: 'initial', data: window.__INITIAL_STATE__ };
            if (window.__REDUX_STATE__) return { type: 'redux', data: window.__REDUX_STATE__ };
            return null;
        });

        if (embedded) {
            console.log(`Encontrado: ${embedded.type}, extrayendo...`);
            results = parseEmbedded(embedded.data);
        }

        // DOM fallback
        if (results.length < 3) {
            console.log('Extrayendo desde DOM (fallback)...');
            results = await extractStarbucksDOM(page);
        }

        // Navigate subcategories if still empty
        if (results.length < 3) {
            console.log('Navegando por subcategorías...');
            results = await scrapeBySubcategories(page, url);
        }

    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
    }

    return saveUnique(results, 'starbucks-pe');
}

function parseEmbedded(data) {
    const results = [];
    // Never promote a product name into the category context — that produced
    // "category = previous product" rows when walking nested menu trees.
    function looksLikeProduct(obj) {
        return !!(obj && (obj.name || obj.title) && (
            obj.price !== undefined || obj.basePrice !== undefined ||
            obj.defaultPrice !== undefined || obj.sizes
        ));
    }
    function walk(obj, category = 'Bebidas') {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) { obj.forEach(i => walk(i, category)); return; }
        if (looksLikeProduct(obj)) {
            const priceRaw = obj.price ?? obj.basePrice ?? obj.defaultPrice ?? 0;
            let price = typeof priceRaw === 'number'
                ? (priceRaw > 1000 ? priceRaw / 100 : priceRaw)
                : parseFloat(priceRaw) || 0;
            if (obj.sizes && Array.isArray(obj.sizes)) {
                const prices = obj.sizes.map(s => s.price ?? s.cost ?? 0).filter(p => p > 0);
                if (prices.length > 0) {
                    const min = Math.min(...prices);
                    price = min > 1000 ? min / 100 : min;
                }
            }
            if (price > 0) {
                const cat =
                    (typeof obj.category === 'string' && obj.category) ||
                    (typeof obj.categoryName === 'string' && obj.categoryName) ||
                    category;
                results.push({
                    restaurant: 'Starbucks',
                    category: cat,
                    name: (obj.name || obj.title || '').replace(/\u200b/g, '').trim(),
                    description: obj.description || obj.shortDescription || '',
                    price,
                });
            }
            // Still walk nested children with the same section category
            Object.values(obj).forEach(v => {
                if (v && typeof v === 'object') walk(v, category);
            });
            return;
        }
        // Only explicit category fields may change the walk context — never obj.name
        const nextCat =
            (typeof obj.categoryName === 'string' && obj.categoryName) ||
            (typeof obj.category === 'string' && obj.category) ||
            category;
        Object.values(obj).forEach(v => walk(v, nextCat));
    }
    walk(data);
    return results;
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const t = setInterval(() => {
                window.scrollBy(0, 400);
                y += 400;
                if (y >= document.body.scrollHeight) { clearInterval(t); resolve(); }
            }, 300);
        });
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
}

async function extractStarbucksDOM(page) {
    return page.evaluate(() => {
        const results = [];
        let currentCategory = 'Bebidas';
        const SECTION_RE = /bebidas|alimentos|frappuccino|espresso|caf[eé]|te\b|t[eé]|bakery|comida|merchandise|merch|seasonal|protein|refreshers/i;

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        while (walker.nextNode()) {
            const el = walker.currentNode;

            // Only treat headings as sections when they look like menu groups —
            // product titles (H3/H4) must not become the next item's category.
            if ((el.tagName === 'H1' || el.tagName === 'H2') &&
                !el.closest('[class*="product"]') &&
                !el.closest('[class*="item"]') &&
                !el.closest('article')) {
                const txt = el.textContent?.trim();
                if (txt && txt.length > 1 && txt.length < 60 && SECTION_RE.test(txt)) {
                    currentCategory = txt;
                }
            }

            const isProductCard = (
                el.matches('[class*="product"], [class*="menu-item"], [class*="food-item"], article') &&
                !el.matches('[class*="product"] [class*="product"]')
            );
            if (!isProductCard) continue;

            const nameEl = el.querySelector('h3, h4, h5, [class*="name"], [class*="title"]');
            const name = nameEl?.textContent?.replace(/\u200b/g, '').trim() || '';
            if (!name || name.length < 2) continue;

            const strikeEls = el.querySelectorAll('del, s, [class*="line-through"], [class*="old"], [class*="was"]');
            const striked = new Set();
            strikeEls.forEach(se => {
                const m = se.textContent.match(/[\d.,]+/);
                if (m) striked.add(parseFloat(m[0].replace(',', '.')));
            });

            const priceMatches = [...el.textContent.matchAll(/S\/\s*([\d.,]+)/g)];
            const prices = priceMatches.map(m => parseFloat(m[1].replace(',', '.'))).filter(p => !isNaN(p) && !striked.has(p));
            const price = prices[0] || 0;
            if (price === 0) continue;

            results.push({ restaurant: 'Starbucks', category: currentCategory, name, description: '', price });
        }
        return results;
    });
}

async function scrapeBySubcategories(page, baseUrl) {
    const results = [];

    // Get subcategory links from the menu
    const catLinks = await page.$$eval(
        'a[href*="/menu/"], nav a, [class*="category"] a',
        links => links
            .map(a => ({ href: a.href, text: a.textContent?.trim() }))
            .filter(l => l.href.includes('/menu') && l.text && l.text.length < 60)
    );

    console.log(`  Subcategorías encontradas: ${catLinks.length}`);

    const seen = new Set([baseUrl]);
    for (const cat of catLinks.slice(0, 20)) {
        if (seen.has(cat.href)) continue;
        seen.add(cat.href);

        try {
            console.log(`  → ${cat.text}: ${cat.href}`);
            await page.goto(cat.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);
            await autoScroll(page);

            const catProducts = await extractStarbucksDOM(page);
            catProducts.forEach(p => { p.category = cat.text; });
            results.push(...catProducts);
            console.log(`     ${catProducts.length} productos`);
        } catch (e) {
            console.warn(`  Falló ${cat.text}: ${e.message}`);
        }
    }

    return results;
}

function saveUnique(results, storeId) {
    const seen = new Set();
    const unique = results.filter(p => {
        if (!p.name || seen.has(p.name)) return false;
        seen.add(p.name);
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

const targetUrl = process.argv[2] || 'https://www.starbucks.pe/menu';
scrapeStarbucks(targetUrl);
