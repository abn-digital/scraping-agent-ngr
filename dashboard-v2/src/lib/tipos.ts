// Las formas de lo que devuelve la API de la v1 (dashboard/server.cjs). Los
// nombres de los campos son los del back: se leen tal cual, sin traducirlos.

/** Un producto de un catálogo, tal como lo guarda el scraper. */
export interface Producto {
  restaurant?: string;
  category: string;
  name: string;
  description?: string;
  price: number;
  /** El precio de lista cuando se capturó una promo. */
  originalPrice?: number;
  /** Quién da la promo (un banco, una tarjeta). */
  promoPartner?: string;
  inStock?: boolean;
  sku?: string;
  productId?: number | string;
}

/** GET /api/results: una tienda con su catálogo vigente. */
export interface Tienda {
  id: string;
  name: string;
  /** "Rappi", "PedidosYa", "Propio" (y algún valor viejo que el back infiere). */
  platform: string;
  local: string;
  lastUpdated: string | null;
  products: Producto[];
  csvFile: string;
}

/** GET /api/history/:storeId */
export interface Corrida {
  at: string;
  productCount: number;
}
export interface Historial {
  storeId: string;
  runs: Corrida[];
}

/** GET /api/history/:storeId/run?at= */
export interface CorridaConProductos {
  storeId: string;
  at: string;
  products: Producto[];
}

/** Los canales del cruce. `cross` es la misma marca entre sus canales. */
export type Canal = "rappi" | "peya" | "propio" | "cross";

export type EstadoDeCelda = "auto" | "pending" | "confirmed" | "rejected";

export interface ProductoCruzado {
  name: string;
  category: string;
  price: number;
  description?: string;
  score?: number;
}

export interface Celda {
  best: ProductoCruzado | null;
  alternatives: ProductoCruzado[];
  status: EstadoDeCelda;
  delta: number | null;
  deltaPct: number | null;
  edited: boolean;
}

export interface FilaDeCruce {
  ngr: ProductoCruzado;
  matches: Record<string, Celda>;
}

export interface Kpi {
  matched: number;
  pending: number;
  cheaper: number;
  pricier: number;
  equal: number;
  avgDeltaPct: number | null;
  priceIndex: number | null;
}

export interface Competidor {
  id: string;
  name: string;
  hasData?: boolean;
  /** Solo en el cruce entre canales: de qué canal es la columna. */
  channel?: string;
}

/** GET /api/matches?brand&channel[&date] */
export interface Comparacion {
  brand: string;
  channel: string;
  mode?: "competition" | "cross" | string;
  anchorChannel?: string | null;
  anchorLabel?: string | null;
  generatedAt: string | null;
  model: string | null;
  snapshotDate?: string | null;
  isHistorical?: boolean;
  competitors: Competidor[];
  missingCompetitors: string[];
  reviewThreshold: number;
  kpis: Record<string, Kpi>;
  rows: FilaDeCruce[];
}

/** GET /api/brands */
export interface Marca {
  key: string;
  label: string;
  channels: {
    channel: Canal;
    competitors: Competidor[];
    hasMatches: boolean;
    mode?: string;
  }[];
}

/** GET /api/matches/dates */
export interface FechasDeCruce {
  brand: string;
  channel: string;
  today: string;
  dates: string[];
}

/** POST /api/matches/override */
export type Decision = "confirm" | "reject" | "reassign" | "reset";
