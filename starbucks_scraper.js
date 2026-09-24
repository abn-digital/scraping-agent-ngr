const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const { stamp } = require('./scrape_meta');
const fs = require('fs');
const path = require('path');

/**
 * Starbucks Peru scraper — starbucks.pe/menu
 *
 * Category = first subcategory only (e.g. "Bebidas Proteicas", "Frappuccinos"),
 * never the parent ("Bebidas") and never a product name.
 *
 * Flow:
 *   1. Visit each top section (/bebidas, /alimentos, …)
 *   2. Collect subcategory links (/bebidas/bebidas-proteicas, …)
 *   3. Scrape each subcategory page and tag products with that subcat name
 */
const TOP_SECTIONS = [
    { slug: 'bebidas', name: 'Bebidas' },
    { slug: 'alimentos', name: 'Alimentos' },
    { slug: 'merch-cafe-en-grano', name: 'Merch & Café en Grano' },
    { slug: 'packs-boxes', name: 'Packs & Boxes' },
];

async function scrapeStarbucks(url = 'https://www.starbucks.pe/menu') {
    console.log(`Iniciando scraping de Starbucks Peru: ${url}`);
    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });

    const page = await context.newPage();
    const allProducts = [];
    const origin = 'https://www.starbucks.pe';

    try {
        for (const section of TOP_SECTIONS) {
            const sectionUrl = `${origin}/menu/${section.slug}`;
            console.log(`\nSección: ${section.name} (${sectionUrl})`);
            await page.goto(sectionUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(2000);

            const subcats = await discoverSubcategories(page, section);
            console.log(`  Subcategorías: ${subcats.length} → ${subcats.map(s => s.name).join(', ') || '(ninguna)'}`);

            if (subcats.length === 0) {
                await autoScroll(page);
                const products = await extractProducts(page, section.name);
                console.log(`  → ${section.name}: ${products.length} productos`);
                allProducts.push(...products);
                continue;
            }

            for (const sub of subcats) {
                try {
                    console.log(`  → ${sub.name}: ${sub.href}`);
                    await page.goto(sub.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    await page.waitForTimeout(1500);
                    await autoScroll(page);
                    const products = await extractProducts(page, sub.name);
                    console.log(`     ${products.length} productos`);
                    allProducts.push(...products);
                } catch (e) {
                    console.warn(`     Falló ${sub.name}: ${e.message}`);
                }
            }
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
    } finally {
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
    }

    return saveUnique(allProducts, 'starbucks-pe');
}

/**
 * Subcategory chips under a top section. Skip "Todo" and the section itself.
 */
async function discoverSubcategories(page, section) {
    return page.evaluate(({ sectionSlug, sectionName }) => {
        const clean = (t) => (t || '')
            .replace(/\u200b/g, '')
            .replace(/[®™]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        const links = [...document.querySelectorAll('a[href*="/menu/"]')];
        const seen = new Set();
        const out = [];

        for (const a of links) {
            let href = a.href || '';
            try { href = new URL(href, location.origin).href; } catch (_) { continue; }
            const path = (() => { try { return new URL(href).pathname; } catch { return ''; } })();
            // Expect /menu/<section>/<sub>
            const m = path.match(new RegExp(`^/menu/${sectionSlug}/([a-z0-9-]+)/?$`, 'i'));
            if (!m) continue;

            let name = clean(a.textContent);
            if (!name || name.length > 60) {
                name = m[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
            if (/^todo$/i.test(name)) continue;
            if (name.toLowerCase() === sectionName.toLowerCase()) continue;
            if (seen.has(href)) continue;
            seen.add(href);
            out.push({ href, name, slug: m[1] });
        }
        return out;
    }, { sectionSlug: section.slug, sectionName: section.name });
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let y = 0;
            const t = setInterval(() => {
                window.scrollBy(0, 400);
                y += 400;
                if (y >= document.body.scrollHeight) { clearInterval(t); resolve(); }
            }, 250);
        });
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
}

/**
 * Product cards on the current subcategory page.
 * Starbucks renders items as buttons: "NameDesde S/ 22.00"
 */
async function extractProducts(page, category) {
    return page.evaluate((cat) => {
        const results = [];
        const seen = new Set();
        const clean = (t) => (t || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();

        const candidates = [
            ...document.querySelectorAll('button, a, article, [class*="product"], [class*="Product"]'),
        ];

        for (const el of candidates) {
            const raw = clean(el.textContent);
            if (!raw || raw.length < 6 || raw.length > 160) continue;

            const priceMatch = raw.match(/S\/\s*([\d.,]+)/);
            if (!priceMatch) continue;
            const price = parseFloat(priceMatch[1].replace(',', '.'));
            if (!price || price <= 0) continue;

            // Name before "Desde S/" or first S/
            let name = raw
                .replace(/Desde\s*S\/\s*[\d.,]+.*$/i, '')
                .replace(/S\/\s*[\d.,]+.*$/i, '')
                .replace(/\bNuevo\b/gi, '')
                .trim();
            name = clean(name);
            if (!name || name.length < 2 || name.length > 100) continue;
            // Skip nav / chip labels mistaken as products
            if (/^(Todo|Bebidas|Alimentos|Menú|Menu|Frappuccinos|Café|Refreshers|Packs)/i.test(name)
                && name.length < 25
                && !/Frappuccino|Latte|Matcha|Mocha|Brew|Drink/i.test(name)) {
                continue;
            }

            const key = name.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            results.push({
                restaurant: 'Starbucks',
                category: cat,
                name,
                description: '',
                price,
            });
        }
        return results;
    }, category);
}

function saveUnique(results, storeId) {
    const seen = new Set();
    const unique = results.filter(p => {
        const key = `${(p.name || '').toLowerCase()}||${(p.category || '').toLowerCase()}`;
        if (!p.name || seen.has(key)) return false;
        // Also collapse same name across cats: keep first (subcat pass order)
        const nameKey = p.name.toLowerCase();
        if (seen.has(`name:${nameKey}`)) return false;
        seen.add(key);
        seen.add(`name:${nameKey}`);
        return true;
    });

    console.log(`\nTotal de productos únicos extraídos: ${unique.length}`);
    const catCounts = {};
    unique.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    console.log('Categorías:', Object.entries(catCounts).map(([k, v]) => `${k}(${v})`).join(', '));

    if (unique.length > 0) {
        const jsonPath = path.join(__dirname, `products_${storeId}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(unique, null, 2));
        try {
            fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
            fs.copyFileSync(jsonPath, path.join(__dirname, 'data', `products_${storeId}.json`));
        } catch (_) {}
        const header = 'Restaurant,Category,Product Name,Description,Price';
        const rows = unique.map(p =>
            [esc(p.restaurant), esc(p.category), esc(p.name), esc(p.description), p.price].join(',')
        );
        fs.writeFileSync(path.join(__dirname, `products_${storeId}.csv`), [header, ...rows].join('\n'));
        stamp(storeId);
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
