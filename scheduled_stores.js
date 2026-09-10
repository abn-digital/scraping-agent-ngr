/**
 * Stores scraped by the daily scheduled batch (Propio + Rappi).
 * PedidosYa is handled separately by scrape_pedidosya_session.js.
 */
function scriptForUrl(url) {
    if (url.includes('rappi.com.pe')) return 'rappi_scraper.js';
    if (url.includes('mcdonalds.com.pe')) return 'mcdonalds_scraper.js';
    if (url.includes('burgerking.pe')) return 'burgerking_scraper.js';
    if (url.includes('kfc.com.pe')) return 'kfc_scraper.js';
    if (url.includes('pizzahut.com.pe')) return 'pizzahut_scraper.js';
    if (url.includes('yopo.pe')) return 'yopo_scraper.js';
    if (url.includes('littlecaesars.com')) return 'littlecaesars_scraper.js';
    if (url.includes('wanta.pe') || url.includes('chifaexpress.pe') || url.includes('cinnabon.com.pe')) {
        return 'digifood_scraper.js';
    }
    if (url.includes('starbucks.pe')) return 'starbucks_scraper.js';
    if (url.includes('rokys.com')) return 'rokys_scraper.js';
    if (url.includes('bembos.com.pe') || url.includes('popeyes.com.pe') ||
        url.includes('papajohns.com.pe') || url.includes('dunkin.pe') ||
        url.includes('donbelisario.com.pe') || url.includes('chinawok.com.pe')) {
        return 'magento_scraper.js';
    }
    return null;
}

const STORES = [
    // ── Rappi – marcas propias NGR ──
    { id: '1109',  name: 'Bembos',        platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/1109-bembos' },
    { id: '95275', name: 'Popeyes',       platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/95275-popeyes' },
    { id: '61955', name: "Dunkin'",       platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/61955-dunkin' },
    { id: '1121',  name: 'Papa Johns',    platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/1121-papa-johns' },
    { id: '1190',  name: 'Don Belisario', platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/1190-don-belisario' },
    { id: '10266', name: 'Chinawok',      platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/10266-chinawok-chifa' },

    // ── Rappi – competencia ──
    { id: '742',   name: "McDonald's",    platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/742-mcdonalds' },
    { id: '2376',  name: 'Burger King',   platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/2376-burger-king' },
    { id: '6337',  name: 'KFC',           platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/6337-kfc' },
    { id: '58629', name: 'Yopo',          platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/58629-yopo' },
    { id: '2372',  name: 'Pizza Hut',     platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/2372-pizza-hut' },
    { id: '74738', name: "Domino's",      platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/74738-dominos-pizza' },
    { id: '4136',  name: 'Little Caesars',platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/4136-little-caesars' },
    { id: '73245', name: 'Wanta Chifa',   platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/73245-wanta-chifa' },
    { id: '13399', name: 'Chifa Express', platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/13399-chifa-express-chifa' },
    { id: '38002', name: 'Starbucks',     platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/38002-starbucks' },
    { id: '79108', name: 'Juan Valdez',   platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/79108-juan-valdez' },
    { id: '66914', name: 'Cinnabon',      platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/66914-cinnabon' },
    { id: '4580',  name: 'Pardos Chicken',platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/4580-pardos-chicken' },
    { id: '5341',  name: 'Rokys',         platform: 'Rappi', url: 'https://www.rappi.com.pe/restaurantes/5341-rokys' },

    // ── Locales propios ──
    { id: 'bembos-pe',               name: 'Bembos',                 platform: 'Propio', url: 'https://www.bembos.com.pe/menu' },
    { id: 'popeyes-pe',              name: 'Popeyes',                platform: 'Propio', url: 'https://www.popeyes.com.pe/menu' },
    { id: 'dunkin-pe',               name: "Dunkin'",                platform: 'Propio', url: 'https://www.dunkin.pe/menu' },
    { id: 'papajohns-pe',            name: 'Papa Johns',             platform: 'Propio', url: 'https://www.papajohns.com.pe/menu' },
    { id: 'donbelisario-pe',         name: 'Don Belisario',          platform: 'Propio', url: 'https://www.donbelisario.com.pe/menu' },
    { id: 'chinawok-pe',             name: 'Chinawok',               platform: 'Propio', url: 'https://www.chinawok.com.pe/menu' },
    { id: 'mcd-benavides-aurora-bau',name: "McDonald's Benavides",   platform: 'Propio', url: 'https://www.mcdonalds.com.pe/restaurantes/lima/benavides-aurora-bau/pedidos' },
    { id: 'mcd-ovalo-gutierrez',     name: "McDonald's Óvalo",       platform: 'Propio', url: 'https://www.mcdonalds.com.pe/restaurantes/lima/ovalo-gutierrez/pedidos' },
    { id: 'mcd-izaguirre-iza',       name: "McDonald's Izaguirre",   platform: 'Propio', url: 'https://www.mcdonalds.com.pe/restaurantes/lima/izaguirre-iza/pedidos' },
    { id: 'burgerking-pe',           name: 'Burger King',            platform: 'Propio', url: 'https://www.burgerking.pe/carta' },
    { id: 'kfc-pe',                  name: 'KFC',                    platform: 'Propio', url: 'https://www.kfc.com.pe/carta' },
    { id: 'yopo-pe',                 name: 'Yopo',                   platform: 'Propio', url: 'https://yopo.pe/categorias/' },
    { id: 'pizzahut-miraflores',     name: 'Pizza Hut Miraflores',   platform: 'Propio', url: 'https://www.pizzahut.com.pe/carta' },
    { id: 'littlecaesars-pe',        name: 'Little Caesars',         platform: 'Propio', url: 'https://pe.littlecaesars.com/es-pe/menu/' },
    { id: 'wanta-pe',                name: 'Wanta',                  platform: 'Propio', url: 'https://www.wanta.pe/carta' },
    { id: 'chifaexpress-pe',         name: 'Chifa Express',          platform: 'Propio', url: 'https://www.chifaexpress.pe/pedir' },
    { id: 'starbucks-pe',            name: 'Starbucks',              platform: 'Propio', url: 'https://www.starbucks.pe/menu' },
    { id: 'cinnabon-pe',             name: 'Cinnabon',               platform: 'Propio', url: 'https://www.cinnabon.com.pe/pedir' },
    { id: 'rokys-pe',                name: 'Rokys',                  platform: 'Propio', url: 'https://rokys.com/menu' },
].map(s => ({ ...s, script: scriptForUrl(s.url) }));

module.exports = { STORES, scriptForUrl };
