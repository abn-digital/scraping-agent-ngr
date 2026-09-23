const { createKernelBrowser, closeKernelBrowser } = require('./kernel_browser');
const fs = require('fs');
const path = require('path');

/**
 * Escapes a string for CSV format.
 */
function escapeCsv(str) {
    if (str === null || str === undefined) return '';
    const formatted = String(str).replace(/"/g, '""');
    return `"${formatted}"`;
}

async function scrapeRappi(url) {
    console.log(`🌐 Conectando al navegador remoto en Kernel (proxy residencial Perú)...`);
    const { browser, context, kernelBrowser, kernel } = await createKernelBrowser({
        proxy: 'ngr-peru',
        stealth: true,
    });
    const page = await context.newPage();

    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (err) {
        console.error('Error navigating:', err.message);
    }

    console.log('Extracting data from __NEXT_DATA__...');
    const nextData = await page.evaluate(() => {
        const script = document.getElementById('__NEXT_DATA__');
        return script ? JSON.parse(script.textContent) : null;
    });

    if (!nextData) {
        console.error('Could not find __NEXT_DATA__ script tag.');
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
        return;
    }

    const pageProps = nextData.props.pageProps;
    const fallback = pageProps.fallback;

    const storeKey = Object.keys(fallback).find(key => key.includes('restaurant/'));

    if (!storeKey) {
        console.error('Could not find restaurant data in fallback.');
        console.log('Available keys in fallback:', Object.keys(fallback));
        await closeKernelBrowser({ browser, kernelBrowser, kernel });
        return;
    }

    let storeData = fallback[storeKey];
    if (storeData.store) storeData = storeData.store;
    if (!storeData.corridors && storeData.restaurant) storeData = storeData.restaurant;

    const restaurantName = storeData.name || storeData.restaurant_name || 'Unknown Restaurant';
    const corridors = storeData.corridors || [];

    const results = [];

    corridors.forEach(corridor => {
        const categoryName = corridor.name;
        const products = corridor.products || [];

        products.forEach(product => {
            results.push({
                restaurant: restaurantName,
                category: categoryName,
                name: product.name,
                description: product.description,
                price: product.price,            // original price from __NEXT_DATA__
                originalPrice: product.price,    // keep a copy
                productId: product.id,
                inStock: product.is_available !== false && product.out_of_stock !== true
            });
        });
    });

    // __NEXT_DATA__ prices are the ORIGINAL/LIST prices (not promo prices).
    // Rappi renders discount prices dynamically via client-side JS.
    // Wait for JS to hydrate, then read actual displayed prices from the DOM.
    console.log('Waiting for Rappi to render promo prices in the DOM...');
    try {
        await page.waitForSelector('[data-qa^="product-item-"]', { timeout: 15000 });
        await page.waitForTimeout(3000); // give extra time for promo prices to load

        // Auto-scroll to trigger lazy-loaded sections
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let y = 0;
                const t = setInterval(() => {
                    window.scrollBy(0, 400);
                    y += 400;
                    if (y >= document.body.scrollHeight) { clearInterval(t); resolve(); }
                }, 200);
            });
            window.scrollTo(0, 0);
        });
        await page.waitForTimeout(2000);

        // Extract rendered prices from DOM — these include promo/discount prices
        // Key by productId so same-name variants keep distinct prices (Dunkin Green Obsession, etc.)
        const domPrices = await page.evaluate(() => {
            const priceMap = {};
            document.querySelectorAll('[data-qa^="product-info-"]').forEach(card => {
                const qa = card.getAttribute('data-qa');
                const productId = qa?.replace('product-info-', '');
                if (!productId) return;

                const nameEl = card.querySelector('h4');
                const name = nameEl?.textContent?.trim();
                if (!name) return;

                const priceTexts = [];
                card.querySelectorAll('span').forEach(span => {
                    const text = span.textContent?.trim();
                    if (text?.startsWith('S/')) {
                        const match = text.match(/S\/\s*([\d.,]+)/);
                        if (match) priceTexts.push(parseFloat(match[1].replace(',', '.')));
                    }
                });

                if (priceTexts.length > 0) {
                    const entry = {
                        name,
                        renderedPrice: priceTexts[0],
                        allPrices: priceTexts,
                        productId,
                    };
                    priceMap[productId] = entry;
                    // Fallback by name only when this name is unique in the map
                    if (!priceMap[`name:${name}`]) {
                        priceMap[`name:${name}`] = entry;
                    } else {
                        // Ambiguous name → drop name fallback so we don't overwrite siblings
                        priceMap[`name:${name}`] = null;
                    }
                }
            });
            return priceMap;
        });

        // Override __NEXT_DATA__ prices with DOM-rendered prices (prefer productId)
        let updatedCount = 0;
        results.forEach(product => {
            const domData =
                (product.productId && domPrices[String(product.productId)]) ||
                domPrices[`name:${product.name}`];
            if (domData && domData.renderedPrice && domData.renderedPrice !== product.price) {
                console.log(`  💰 ${product.name} [${product.productId}]: S/${product.price} → S/${domData.renderedPrice} (promo)`);
                product.originalPrice = product.price;
                product.price = domData.renderedPrice;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            console.log(`Updated ${updatedCount} products with promo prices from DOM.`);
        } else {
            console.log('No promo price differences found (all prices match __NEXT_DATA__).');
        }
    } catch (err) {
        console.warn('Could not read DOM prices, using __NEXT_DATA__ prices:', err.message);
    }

    console.log(`Successfully extracted ${results.length} products from ${restaurantName}.`);

    if (results.length > 0) {
        // Create CSV Content
        const headers = ['Restaurant', 'Category', 'Product Name', 'Description', 'Price', 'In Stock'];
        const csvRows = [headers.join(',')];

        results.forEach(row => {
            const values = [
                escapeCsv(row.restaurant),
                escapeCsv(row.category),
                escapeCsv(row.name),
                escapeCsv(row.description),
                row.price,
                row.inStock
            ];
            csvRows.push(values.join(','));
        });

        const csvContent = csvRows.join('\n');

        // Use a cleaner filename for CSV
        const safeStoreId = storeKey.match(/restaurant\/(\d+)/)?.[1] || 'generic';
        const csvFileName = `products_${safeStoreId}.csv`;

        fs.writeFileSync(csvFileName, csvContent, 'utf8');
        console.log(`Results saved to ${csvFileName}`);

        // Also save JSON as backup (optional but good practice)
        fs.writeFileSync(`products_${safeStoreId}.json`, JSON.stringify(results, null, 2));
    }

    await closeKernelBrowser({ browser, kernelBrowser, kernel });
    return results;
}

const targetUrl = process.argv[2] || 'https://www.rappi.com.pe/restaurantes/742-mcdonalds';
scrapeRappi(targetUrl);
