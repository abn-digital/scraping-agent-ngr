import type { Canal } from "./tipos";

// Las tiendas que la app conoce, portadas tal cual de la v1 (App.tsx:
// NGR_OWN_RAPPI, NGR_GROUPS, NGR_OWN_PEYA, NGR_GROUPS_PEYA, NGR_OWN_GROUPS) y
// las anclas de cada marca de brand_config.js. La URL es la que recibe
// POST /api/update para volver a leer el catálogo.

export type Plataforma = "Rappi" | "PedidosYa" | "Propio";

export interface TiendaConocida {
  id: string;
  nombre: string;
  url: string;
  plataforma: Plataforma;
  /** La marca de NGR con la que se agrupa (la propia o contra la que compite). */
  marca: string;
  propia: boolean;
}

export interface MarcaNgr {
  key: string;
  label: string;
}

export const MARCAS_NGR: MarcaNgr[] = [
  { key: "bembos", label: "Bembos" },
  { key: "popeyes", label: "Popeyes" },
  { key: "papajohns", label: "Papa Johns" },
  { key: "chinawok", label: "Chinawok" },
  { key: "dunkin", label: "Dunkin'" },
  { key: "donbelisario", label: "Don Belisario" },
];

const R = "https://www.rappi.com.pe/restaurantes/";
const P = "https://www.pedidosya.com.pe/restaurantes/lima/";

type Fila = [id: string, nombre: string, url: string];
const grupo = (plataforma: Plataforma, marca: string, propia: Fila[], competencia: Fila[]) => [
  ...propia.map(([id, nombre, url]) => ({ id, nombre, url, plataforma, marca, propia: true })),
  ...competencia.map(([id, nombre, url]) => ({
    id,
    nombre,
    url,
    plataforma,
    marca,
    propia: false,
  })),
];

export const TIENDAS: TiendaConocida[] = [
  // Rappi
  ...grupo(
    "Rappi",
    "bembos",
    [["1109", "Bembos", `${R}1109-bembos`]],
    [
      ["742", "McDonald's", `${R}742-mcdonalds`],
      ["2376", "Burger King", `${R}2376-burger-king`],
    ],
  ),
  ...grupo(
    "Rappi",
    "popeyes",
    [["95275", "Popeyes", `${R}95275-popeyes`]],
    [
      ["6337", "KFC", `${R}6337-kfc`],
      ["58629", "Yopo", `${R}58629-yopo`],
    ],
  ),
  ...grupo(
    "Rappi",
    "papajohns",
    [["1121", "Papa Johns", `${R}1121-papa-johns`]],
    [
      ["2372", "Pizza Hut", `${R}2372-pizza-hut`],
      ["74738", "Domino's Pizza", `${R}74738-dominos-pizza`],
      ["4136", "Little Caesars", `${R}4136-little-caesars`],
    ],
  ),
  ...grupo(
    "Rappi",
    "chinawok",
    [["10266", "Chinawok", `${R}10266-chinawok-chifa`]],
    [
      ["73245", "Wanta Chifa", `${R}73245-wanta-chifa`],
      ["13399", "Chifa Express", `${R}13399-chifa-express-chifa`],
    ],
  ),
  ...grupo(
    "Rappi",
    "dunkin",
    [["61955", "Dunkin'", `${R}61955-dunkin`]],
    [
      ["38002", "Starbucks", `${R}38002-starbucks`],
      ["79108", "Juan Valdez", `${R}79108-juan-valdez`],
      ["66914", "Cinnabon", `${R}66914-cinnabon`],
    ],
  ),
  ...grupo(
    "Rappi",
    "donbelisario",
    [["1190", "Don Belisario", `${R}1190-don-belisario`]],
    [
      ["4580", "Pardos Chicken", `${R}4580-pardos-chicken`],
      ["5341", "Rokys", `${R}5341-rokys`],
    ],
  ),

  // PedidosYa (zona Miraflores / Óvalo Gutiérrez)
  ...grupo(
    "PedidosYa",
    "bembos",
    [
      [
        "peya-bembos",
        "Bembos",
        `${P}bembos-ovalo-gutierrez-699066be-2b00-4117-b698-60200ae31ecc-menu`,
      ],
    ],
    [
      [
        "peya-mcdonalds",
        "McDonald's",
        `${P}mcdonalds-ovalo-gutierrez-e6b6652e-45c6-44f7-8976-e376edf475a8-menu`,
      ],
      ["peya-burgerking", "Burger King", `${P}burger-king-cavenecia-menu`],
    ],
  ),
  ...grupo(
    "PedidosYa",
    "popeyes",
    [["peya-popeyes", "Popeyes", `${P}popeyes-larco-menu`]],
    [
      ["peya-kfc", "KFC", `${P}kfc-cavenecia-b16e2057-319a-4649-8b55-e0a9f2819f25-menu`],
      [
        "peya-yopo",
        "Yopo",
        `${P}yopo--comandante-espinar-dd561e26-1e20-4821-8de0-0600196ca88f-menu`,
      ],
    ],
  ),
  ...grupo(
    "PedidosYa",
    "papajohns",
    [
      [
        "peya-papajohns",
        "Papa Johns",
        `${P}papa-johns-comandante-espinar-2edda678-595b-46cd-bf38-009fea1e31b8-menu`,
      ],
    ],
    [
      ["peya-pizzahut", "Pizza Hut", `${P}pizza-hut-espinar-menu`],
      // Domino's: la v1 no tiene un local cerca de Óvalo Gutiérrez.
      ["peya-littlecaesars", "Little Caesars", `${P}little-caesars-pizza-miraflores-menu`],
    ],
  ),
  ...grupo(
    "PedidosYa",
    "chinawok",
    [
      [
        "peya-chinawok",
        "Chinawok",
        `${P}chinawok-patio-larco-8bd1f1e5-a9c1-451f-a635-97b27066f0f8-menu`,
      ],
    ],
    [
      [
        "peya-wanta",
        "Wanta Chifa",
        `${P}wanta-chifa-santa-cruz-add0b531-7c31-4784-9248-c5ad98760f27-menu`,
      ],
      ["peya-chifaexpress", "Chifa Express", `${P}chifa-express-6-menu`],
    ],
  ),
  ...grupo(
    "PedidosYa",
    "dunkin",
    [
      [
        "peya-dunkin",
        "Dunkin'",
        `${P}dunkin-donuts--plaza-vea-dasso-94678500-43d1-416f-952b-3324db81f862-menu`,
      ],
    ],
    [
      [
        "peya-starbucks",
        "Starbucks",
        `${P}starbucks-dasso-1d98eee0-22b6-4f5d-bc6f-5bab57b685d3-menu`,
      ],
      [
        "peya-juanvaldez",
        "Juan Valdez",
        `${P}juan-valdez--pardo-e98f160c-e5d8-4391-8697-db1976868a4c-menu`,
      ],
      [
        "peya-cinnabon",
        "Cinnabon",
        `${P}cinnabon--larcomar-ce7504bd-203c-40d6-baca-da72f1c94b2c-menu`,
      ],
    ],
  ),
  ...grupo(
    "PedidosYa",
    "donbelisario",
    [
      [
        "peya-donbelisario",
        "Don Belisario",
        `${P}don-belisario-larco-93da4fb3-c49b-4607-ae33-4733f1343acc-menu`,
      ],
    ],
    [
      ["peya-pardos", "Pardos Chicken", `${P}pardos-chicken-santa-cruz-menu`],
      ["peya-rokys", "Rokys", `${P}rokys-angamos-este-menu`],
    ],
  ),

  // Sitios propios
  ...grupo(
    "Propio",
    "bembos",
    [["bembos-pe", "Bembos", "https://www.bembos.com.pe/menu"]],
    [
      [
        "mcd-benavides-aurora-bau",
        "McDonald's (Benavides)",
        "https://www.mcdonalds.com.pe/restaurantes/lima/benavides-aurora-bau/pedidos",
      ],
      ["burgerking-pe", "Burger King", "https://www.burgerking.pe/carta"],
    ],
  ),
  ...grupo(
    "Propio",
    "popeyes",
    [["popeyes-pe", "Popeyes", "https://www.popeyes.com.pe/menu"]],
    [
      ["kfc-pe", "KFC", "https://www.kfc.com.pe/carta"],
      ["yopo-pe", "Yopo", "https://yopo.pe/categorias/"],
    ],
  ),
  ...grupo(
    "Propio",
    "papajohns",
    [["papajohns-pe", "Papa Johns", "https://www.papajohns.com.pe/menu"]],
    [
      ["pizzahut-miraflores", "Pizza Hut (Miraflores)", "https://www.pizzahut.com.pe/carta"],
      ["littlecaesars-pe", "Little Caesars", "https://pe.littlecaesars.com/es-pe/menu/"],
    ],
  ),
  ...grupo(
    "Propio",
    "chinawok",
    [["chinawok-pe", "Chinawok", "https://www.chinawok.com.pe/menu"]],
    [
      ["wanta-pe", "Wanta", "https://www.wanta.pe/carta"],
      ["chifaexpress-pe", "Chifa Express", "https://www.chifaexpress.pe/pedir"],
    ],
  ),
  ...grupo(
    "Propio",
    "dunkin",
    [["dunkin-pe", "Dunkin'", "https://www.dunkin.pe/menu"]],
    [
      ["starbucks-pe", "Starbucks", "https://www.starbucks.pe/menu"],
      ["cinnabon-pe", "Cinnabon", "https://www.cinnabon.com.pe/pedir"],
    ],
  ),
  ...grupo(
    "Propio",
    "donbelisario",
    [["donbelisario-pe", "Don Belisario", "https://www.donbelisario.com.pe/menu"]],
    [["rokys-pe", "Rokys", "https://rokys.com/menu"]],
  ),
];

export function tiendaConocida(id: string): TiendaConocida | undefined {
  return TIENDAS.find((t) => t.id === id);
}

/** La URL que se le pasa al scraper. Igual que la v1: si no es conocida, se asume Rappi. */
export function urlDeActualizacion(id: string): string {
  return tiendaConocida(id)?.url ?? `${R}${id}`;
}

/** La v1 no deja actualizar PedidosYa a mano: arriesga un bloqueo de PerimeterX. */
export function sePuedeActualizar(id: string, plataforma?: string): boolean {
  const url = urlDeActualizacion(id);
  return plataforma !== "PedidosYa" && !url.includes("pedidosya.com.pe");
}

// Los canales, con su nombre en la interfaz (en oración, no en Title Case como
// los manda el back).
export const CANALES: { value: Canal; label: string }[] = [
  { value: "rappi", label: "Rappi" },
  { value: "peya", label: "PedidosYa" },
  { value: "propio", label: "Sitio propio" },
  { value: "cross", label: "Entre canales" },
];

export const NOMBRE_DE_CANAL: Record<string, string> = {
  rappi: "Rappi",
  peya: "PedidosYa",
  propio: "Sitio propio",
  cross: "Entre canales",
};

export const PLATAFORMA_DE_CANAL: Record<Exclude<Canal, "cross">, Plataforma> = {
  rappi: "Rappi",
  peya: "PedidosYa",
  propio: "Propio",
};

export const CANAL_DE_PLATAFORMA: Record<string, Exclude<Canal, "cross">> = {
  Rappi: "rappi",
  PedidosYa: "peya",
  Propio: "propio",
};

export const NOMBRE_DE_PLATAFORMA: Record<string, string> = {
  Rappi: "Rappi",
  PedidosYa: "PedidosYa",
  Propio: "Sitio propio",
};

/** La tienda ancla de cada marca por canal (brand_config.js). */
export const ANCLAS: Record<string, Record<Exclude<Canal, "cross">, string>> = {
  bembos: { rappi: "1109", peya: "peya-bembos", propio: "bembos-pe" },
  popeyes: { rappi: "95275", peya: "peya-popeyes", propio: "popeyes-pe" },
  papajohns: { rappi: "1121", peya: "peya-papajohns", propio: "papajohns-pe" },
  chinawok: { rappi: "10266", peya: "peya-chinawok", propio: "chinawok-pe" },
  dunkin: { rappi: "61955", peya: "peya-dunkin", propio: "dunkin-pe" },
  donbelisario: { rappi: "1190", peya: "peya-donbelisario", propio: "donbelisario-pe" },
};

export const esCanal = (v: string | null): v is Canal =>
  v === "rappi" || v === "peya" || v === "propio" || v === "cross";
