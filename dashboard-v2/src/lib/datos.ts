// Lo que comparten todos los gráficos: los colores de las series, los formatos
// de los números y las escalas. Números y fechas siempre en es-AR.

export const MAX_SERIES = 6;

/**
 * El color de la serie en la posición `i`, como variable CSS. Pasadas las seis,
 * todas van en ink-4: son "Otras", y un séptimo color inventado se confundiría
 * con alguno de los seis.
 */
export function colorDeSerie(i: number, oscuro = false): string {
  if (i < 0 || i >= MAX_SERIES) return oscuro ? "var(--color-stage-3)" : "var(--color-ink-4)";
  return `var(--color-dato-${i + 1}${oscuro ? "-soft" : ""})`;
}

/**
 * El color sigue a la entidad, nunca a su puesto: se asigna por el orden de la
 * lista COMPLETA (todas las marcas del cliente, por ejemplo), no de lo que
 * queda después de filtrar. Así, sacar una marca del filtro no repinta a las
 * demás.
 */
export function coloresPorEntidad(todas: string[], oscuro = false): Map<string, string> {
  const mapa = new Map<string, string>();
  todas.forEach((id, i) => mapa.set(id, colorDeSerie(i, oscuro)));
  return mapa;
}

/** Los tonos del sentimiento: son estados (bien, mal, ni una cosa ni la otra), no series. */
export const SENTIMIENTO = {
  positivo: {
    papel: "var(--color-pass)",
    escenario: "var(--color-pass-soft)",
    etiqueta: "Positivo",
  },
  neutral: { papel: "var(--color-ink-4)", escenario: "var(--color-stage-3)", etiqueta: "Neutral" },
  negativo: {
    papel: "var(--color-fail)",
    escenario: "var(--color-fail-soft)",
    etiqueta: "Negativo",
  },
} as const;

const NUM = new Intl.NumberFormat("es-AR");
const COMPACTO = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

/** 1.284 · 12.908 */
export function numero(n: number | null | undefined, decimales?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (decimales == null) return NUM.format(n);
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(n);
}

/** 1284 → "1284" · 12908 → "12,9 mil" · 4200000 → "4,2 M" */
export function compacto(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (Math.abs(n) < 10000) return NUM.format(Math.round(n));
  return COMPACTO.format(n);
}

/** 0.4231 → "42 %" · con decimales, "42,3 %". Recibe una fracción, no un porcentaje. */
export function porcentaje(x: number | null | undefined, decimales = 0): string {
  if (x == null || Number.isNaN(x)) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(x);
}

/** S/ 12,90 · US$ 3,50. `moneda` en ISO 4217. */
export function moneda(n: number | null | undefined, codigo = "PEN", decimales = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  const simbolo: Record<string, string> = {
    PEN: "S/",
    USD: "US$",
    ARS: "$",
    MXN: "MX$",
    CLP: "CLP$",
    COP: "COL$",
  };
  return `${simbolo[codigo] ?? codigo} ${numero(n, decimales)}`;
}

/** +12 % · −3 % (con el signo menos tipográfico). */
export function variacion(x: number | null | undefined, decimales = 0): string {
  if (x == null || Number.isNaN(x)) return "—";
  const p = porcentaje(Math.abs(x), decimales);
  return x > 0 ? `+${p}` : x < 0 ? `−${p}` : p;
}

const FECHA_CORTA = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });
const FECHA_LARGA = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const MES = new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" });

/** "3 sept" · con año si no es el actual: "3 sept 2025". */
export function fecha(d: Date | string | number | null | undefined): string {
  if (d == null) return "—";
  const f = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(f.getTime())) return "—";
  return (f.getFullYear() === new Date().getFullYear() ? FECHA_CORTA : FECHA_LARGA)
    .format(f)
    .replace(".", "");
}

export function mes(d: Date | string | number): string {
  return MES.format(d instanceof Date ? d : new Date(d)).replace(".", "");
}

/**
 * Marcas del eje redondas (0 · 500 · 1.000 · 1.500): el eje lleva los valores
 * que no tienen etiqueta, y un 1.237 no se lee de un vistazo.
 */
export function marcasDelEje(max: number, cuantas = 4): number[] {
  if (!(max > 0)) return [0];
  const bruto = max / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const salida: number[] = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) salida.push(Math.round(v * 1e6) / 1e6);
  if (salida[salida.length - 1]! < max) salida.push(salida[salida.length - 1]! + paso);
  return salida;
}

export function escala(dominio: [number, number], rango: [number, number]) {
  const [d0, d1] = dominio;
  const [r0, r1] = rango;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}
