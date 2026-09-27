import { moneda, porcentaje } from "./datos";
import type { Celda, Comparacion, Competidor, EstadoDeCelda, FilaDeCruce } from "./tipos";

// Las cuentas del cruce de precios, las mismas que hace la v1 (Comparativa.tsx y
// buildComparison en server.cjs), en un solo lugar y con pruebas.
//
// La variación es siempre del propio contra el otro: (propio − otro) / otro.
// Positiva, lo propio está más caro. Se guarda como fracción (0,12 es +12 %),
// que es lo que esperan `variacion` y `porcentaje`.

export type Modo = "competencia" | "canales";

/**
 * Un precio en soles, sin corte entre el símbolo y la cifra: en una columna
 * angosta "S/" quedaba en un renglón y el número en otro.
 */
export const soles = (n: number | null | undefined, decimales = 2) =>
  moneda(n, "PEN", decimales).replace(" ", "\u00a0");

export const modoDe = (c: Pick<Comparacion, "mode" | "channel">): Modo =>
  c.mode === "cross" || c.channel === "cross" ? "canales" : "competencia";

export function variacionDe(propio: number | null | undefined, otro: number | null | undefined) {
  if (!propio || typeof otro !== "number" || otro <= 0) return null;
  return (propio - otro) / otro;
}

/** Los promedios usan solo lo que la IA dio por bueno o una persona confirmó (v1: isPriceReady). */
export const entraEnPromedios = (
  c?: Celda | null,
): c is Celda & { best: NonNullable<Celda["best"]> } =>
  !!c?.best && (c.status === "auto" || c.status === "confirmed");

/** Los competidores que tienen catálogo: la v1 esconde los que no (hasData === false). */
export const conDatos = (competidores: Competidor[]) =>
  competidores.filter((c) => c.hasData !== false);

export type Posicion = "caro" | "barato" | "similar";

/**
 * Para un producto, lo que decide es la diferencia en soles, con el mismo
 * umbral que el back (S/ 0,05). Para un promedio, medio punto porcentual, como
 * las tarjetas de la v1.
 */
export function posicionDeProducto(propio: number, otro: number): Posicion {
  const delta = Math.round((propio - otro) * 100) / 100;
  return delta > 0.05 ? "caro" : delta < -0.05 ? "barato" : "similar";
}

export function posicionDePromedio(x: number | null | undefined): Posicion | null {
  if (x == null || Number.isNaN(x)) return null;
  return x > 0.005 ? "caro" : x < -0.005 ? "barato" : "similar";
}

/**
 * El tono de una posición. Contra la competencia, estar más caro es lo que
 * conviene mirar (el sistema lo dice así: un precio propio es mejor si baja).
 * Entre canales de la misma marca no hay bueno ni malo: es neutro.
 */
export function tonoDe(p: Posicion | null, modo: Modo): "pass" | "fail" | "neutral" {
  if (!p || p === "similar" || modo === "canales") return "neutral";
  return p === "caro" ? "fail" : "pass";
}

export interface Resumen {
  /** Promedio simple de la variación producto por producto. */
  promedio: number | null;
  /** Índice canasta: suma propia / suma del otro. 1,12 es 12 % más caro, ponderado por precio. */
  indice: number | null;
  productos: number;
  masBarato: number;
  masCaro: number;
  similar: number;
  aRevisar: number;
  sinEquivalente: number;
}

export function resumir(filas: FilaDeCruce[], competidor: string): Resumen {
  let suma = 0;
  let n = 0;
  let sumaPropia = 0;
  let sumaOtra = 0;
  const r: Resumen = {
    promedio: null,
    indice: null,
    productos: 0,
    masBarato: 0,
    masCaro: 0,
    similar: 0,
    aRevisar: 0,
    sinEquivalente: 0,
  };
  for (const fila of filas) {
    const celda = fila.matches[competidor];
    if (celda?.status === "pending") {
      r.aRevisar++;
      continue;
    }
    if (!entraEnPromedios(celda)) {
      r.sinEquivalente++;
      continue;
    }
    const otro = celda.best.price;
    const v = variacionDe(fila.ngr.price, otro);
    if (v == null) continue;
    suma += v;
    n++;
    sumaPropia += fila.ngr.price;
    sumaOtra += otro;
    const p = posicionDeProducto(fila.ngr.price, otro);
    if (p === "caro") r.masCaro++;
    else if (p === "barato") r.masBarato++;
    else r.similar++;
  }
  r.productos = n;
  r.promedio = n ? suma / n : null;
  r.indice = sumaOtra ? sumaPropia / sumaOtra : null;
  return r;
}

export const pendientes = (c: Comparacion) =>
  c.rows.reduce(
    (acc, f) => acc + Object.values(f.matches).filter((m) => m.status === "pending").length,
    0,
  );

/** "En promedio, Bembos está 12 % más caro que McDonald's." */
export function fraseDePromedio(x: number | null, propio: string, otro: string): string {
  const p = posicionDePromedio(x);
  if (p == null) return `Sin productos cruzados con ${otro}.`;
  if (p === "similar") return `${propio} tiene precios similares a ${otro}.`;
  return `En promedio, ${propio} está ${porcentaje(Math.abs(x!))} más ${p === "caro" ? "caro" : "barato"} que ${otro}.`;
}

export const CATEGORIA_VACIA = "Sin categoría";
export const categoriaDe = (c?: string) => c?.trim() || CATEGORIA_VACIA;

/** Los tramos de la distribución: cuántos productos caen en cada rango de diferencia. */
export const TRAMOS: { id: string; etiqueta: string; hasta: number }[] = [
  { id: "m25", etiqueta: "≤ −25 %", hasta: -0.25 },
  { id: "m10", etiqueta: "−25 a −10", hasta: -0.1 },
  { id: "m2", etiqueta: "−10 a −2", hasta: -0.02 },
  { id: "sim", etiqueta: "±2 %", hasta: 0.02 },
  { id: "p10", etiqueta: "+2 a +10", hasta: 0.1 },
  { id: "p25", etiqueta: "+10 a +25", hasta: 0.25 },
  { id: "p25+", etiqueta: "≥ +25 %", hasta: Infinity },
];

export function tramoDe(x: number): number {
  const i = TRAMOS.findIndex((t) => x < t.hasta || (t.id === "sim" && x <= t.hasta));
  return i < 0 ? TRAMOS.length - 1 : i;
}

export function distribucion(filas: FilaDeCruce[], competidor: string): number[] {
  const cuentas = TRAMOS.map(() => 0);
  for (const f of filas) {
    const c = f.matches[competidor];
    if (!entraEnPromedios(c)) continue;
    const v = variacionDe(f.ngr.price, c.best.price);
    if (v == null) continue;
    cuentas[tramoDe(v)]!++;
  }
  return cuentas;
}

export const ESTADO: Record<
  EstadoDeCelda,
  { etiqueta: string; tono: "muted" | "warn" | "pass" | "neutral" }
> = {
  auto: { etiqueta: "IA", tono: "muted" },
  pending: { etiqueta: "A revisar", tono: "warn" },
  confirmed: { etiqueta: "Confirmado", tono: "pass" },
  rejected: { etiqueta: "Sin equivalente", tono: "neutral" },
};

/** El estado que se muestra: sin producto es "sin equivalente", diga lo que diga el status. */
export const estadoVisible = (c?: Celda | null): EstadoDeCelda =>
  !c?.best ? "rejected" : (c.status ?? "pending");
