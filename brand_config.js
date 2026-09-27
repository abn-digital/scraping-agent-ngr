// ──────────────────────────────────────────────
// Single source of truth: NGR brands, their anchor
// store per channel, and the competitors to compare
// against. Consumed by product_matcher.js and the
// Express server (/api/brands, /api/match…).
// ──────────────────────────────────────────────

/**
 * Each brand groups channels:
 *   - rappi:  anchor + competitors on Rappi (numeric store IDs)
 *   - peya:   PedidosYa (peya-* store IDs)
 *   - propio: own websites (slug IDs)
 *
 * `anchorId` / `id` map directly to products_<id>.json files.
 */
const BRANDS = [
  {
    key: 'bembos',
    label: 'Bembos',
    channels: {
      rappi: {
        anchorId: '1109',
        competitors: [
          { id: '742',  name: "McDonald's" },
          { id: '2376', name: 'Burger King' },
        ],
      },
      peya: {
        anchorId: 'peya-bembos',
        competitors: [
          { id: 'peya-mcdonalds',  name: "McDonald's" },
          { id: 'peya-burgerking', name: 'Burger King' },
        ],
      },
      propio: {
        anchorId: 'bembos-pe',
        competitors: [
          { id: 'mcd-benavides-aurora-bau', name: "McDonald's" },
          { id: 'burgerking-pe',     name: 'Burger King' },
        ],
      },
    },
  },
  {
    key: 'popeyes',
    label: 'Popeyes',
    channels: {
      rappi: {
        anchorId: '95275',
        competitors: [
          { id: '6337',  name: 'KFC' },
          { id: '58629', name: 'Yopo' },
        ],
      },
      peya: {
        anchorId: 'peya-popeyes',
        competitors: [
          { id: 'peya-kfc',  name: 'KFC' },
          { id: 'peya-yopo', name: 'Yopo' },
        ],
      },
      propio: {
        anchorId: 'popeyes-pe',
        competitors: [
          { id: 'kfc-pe',  name: 'KFC' },
          { id: 'yopo-pe', name: 'Yopo' },
        ],
      },
    },
  },
  {
    key: 'papajohns',
    label: 'Papa Johns',
    channels: {
      rappi: {
        anchorId: '1121',
        competitors: [
          { id: '2372',  name: 'Pizza Hut' },
          { id: '74738', name: "Domino's Pizza" },
          { id: '4136',  name: 'Little Caesars' },
        ],
      },
      peya: {
        anchorId: 'peya-papajohns',
        competitors: [
          { id: 'peya-pizzahut',      name: 'Pizza Hut' },
          { id: 'peya-littlecaesars', name: 'Little Caesars' },
          // Domino's PeYa URL not configured — omit
        ],
      },
      propio: {
        anchorId: 'papajohns-pe',
        competitors: [
          { id: 'pizzahut-miraflores', name: 'Pizza Hut' },
          { id: 'littlecaesars-pe',    name: 'Little Caesars' },
        ],
      },
    },
  },
  {
    key: 'chinawok',
    label: 'Chinawok',
    channels: {
      rappi: {
        anchorId: '10266',
        competitors: [
          { id: '73245', name: 'Wanta Chifa' },
          { id: '13399', name: 'Chifa Express' },
        ],
      },
      peya: {
        anchorId: 'peya-chinawok',
        competitors: [
          { id: 'peya-wanta',        name: 'Wanta Chifa' },
          { id: 'peya-chifaexpress', name: 'Chifa Express' },
        ],
      },
      propio: {
        anchorId: 'chinawok-pe',
        competitors: [
          { id: 'wanta-pe',        name: 'Wanta' },
          { id: 'chifaexpress-pe', name: 'Chifa Express' },
        ],
      },
    },
  },
  {
    key: 'dunkin',
    label: "Dunkin'",
    channels: {
      rappi: {
        anchorId: '61955',
        competitors: [
          { id: '38002', name: 'Starbucks' },
          { id: '79108', name: 'Juan Valdez' },
          { id: '66914', name: 'Cinnabon' },
        ],
      },
      peya: {
        anchorId: 'peya-dunkin',
        competitors: [
          { id: 'peya-starbucks',  name: 'Starbucks' },
          { id: 'peya-juanvaldez', name: 'Juan Valdez' },
          { id: 'peya-cinnabon',   name: 'Cinnabon' },
        ],
      },
      propio: {
        anchorId: 'dunkin-pe',
        competitors: [
          { id: 'starbucks-pe', name: 'Starbucks' },
          { id: 'cinnabon-pe',  name: 'Cinnabon' },
        ],
      },
    },
  },
  {
    key: 'donbelisario',
    label: 'Don Belisario',
    channels: {
      rappi: {
        anchorId: '1190',
        competitors: [
          { id: '4580', name: 'Pardos Chicken' },
          { id: '5341', name: 'Rokys' },
        ],
      },
      peya: {
        anchorId: 'peya-donbelisario',
        competitors: [
          { id: 'peya-pardos', name: 'Pardos Chicken' },
          { id: 'peya-rokys',  name: 'Rokys' },
        ],
      },
      propio: {
        anchorId: 'donbelisario-pe',
        competitors: [
          { id: 'rokys-pe', name: 'Rokys' },
        ],
      },
    },
  },
];

const CHANNELS = ['rappi', 'peya', 'propio'];

/** Pseudo-channel key for same-brand Rappi / PeYa / Propio comparison. */
const CROSS_CHANNEL = 'cross';

const CHANNEL_LABELS = {
  rappi: 'Rappi',
  peya: 'PedidosYa',
  propio: 'Sitio Propio',
  cross: 'Entre canales',
};

function getBrand(key) {
  return BRANDS.find(b => b.key === key) || null;
}

function getChannelConfig(key, channel) {
  const brand = getBrand(key);
  if (!brand) return null;
  return brand.channels[channel] || null;
}

/**
 * Same brand across delivery channels (not vs competitors).
 * Anchor preference: Sitio propio → Rappi → PedidosYa (first with an anchorId).
 * Other channels become "competitors" columns named by channel label.
 */
function getCrossChannelConfig(brandKey) {
  const brand = getBrand(brandKey);
  if (!brand) return null;

  const prefer = ['propio', 'rappi', 'peya'];
  let anchorChannel = null;
  for (const ch of prefer) {
    if (brand.channels[ch]?.anchorId) {
      anchorChannel = ch;
      break;
    }
  }
  if (!anchorChannel) return null;

  const competitors = [];
  for (const ch of CHANNELS) {
    if (ch === anchorChannel) continue;
    const cfg = brand.channels[ch];
    if (!cfg?.anchorId) continue;
    competitors.push({
      id: cfg.anchorId,
      name: CHANNEL_LABELS[ch],
      channel: ch,
    });
  }
  if (competitors.length === 0) return null;

  return {
    anchorId: brand.channels[anchorChannel].anchorId,
    anchorChannel,
    anchorLabel: CHANNEL_LABELS[anchorChannel],
    competitors,
  };
}

module.exports = {
  BRANDS,
  CHANNELS,
  CROSS_CHANNEL,
  CHANNEL_LABELS,
  getBrand,
  getChannelConfig,
  getCrossChannelConfig,
};
