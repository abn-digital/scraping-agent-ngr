import {
  conDatos,
  entraEnPromedios,
  modoDe,
  posicionDeProducto,
  resumir,
  tonoDe,
  variacionDe,
  type Modo,
  type Resumen,
} from "./precios";
import { NOMBRE_DE_CANAL } from "./tiendas";
import type { Comparacion, Competidor, FilaDeCruce } from "./tipos";

// Lo que el resumen y la revisión calculan sobre varias comparativas a la vez
// (una por marca): los pares marca × competidor y los productos cruzados.

export interface ComparacionDeMarca {
  marca: { key: string; label: string };
  comparacion: Comparacion;
}

export interface Par {
  marca: { key: string; label: string };
  competidor: Competidor;
  resumen: Resumen;
  modo: Modo;
}

export function paresDe(items: ComparacionDeMarca[]): Par[] {
  return items.flatMap(({ marca, comparacion }) =>
    conDatos(comparacion.competitors).map((competidor) => ({
      marca,
      competidor,
      resumen: resumir(comparacion.rows, competidor.id),
      modo: modoDe(comparacion),
    })),
  );
}

export interface Totales {
  productos: number;
  masCaro: number;
  masBarato: number;
  similar: number;
  aRevisar: number;
  /** Promedio de todos los productos cruzados, cada uno pesa lo mismo. */
  promedio: number | null;
}

export function totalesDe(pares: Par[]): Totales {
  const t: Totales = {
    productos: 0,
    masCaro: 0,
    masBarato: 0,
    similar: 0,
    aRevisar: 0,
    promedio: null,
  };
  let suma = 0;
  for (const { resumen: r } of pares) {
    t.productos += r.productos;
    t.masCaro += r.masCaro;
    t.masBarato += r.masBarato;
    t.similar += r.similar;
    t.aRevisar += r.aRevisar;
    if (r.promedio != null) suma += r.promedio * r.productos;
  }
  t.promedio = t.productos ? suma / t.productos : null;
  return t;
}

export interface Cruce {
  marca: { key: string; label: string };
  competidor: Competidor;
  fila: FilaDeCruce;
  otro: string;
  propio: number;
  precioOtro: number;
  variacion: number;
  tono: "pass" | "fail" | "neutral";
}

/** Cada producto con su equivalente en cada competidor, solo los que entran en los promedios. */
export function crucesDe(items: ComparacionDeMarca[]): Cruce[] {
  const salida: Cruce[] = [];
  for (const { marca, comparacion } of items) {
    const modo = modoDe(comparacion);
    for (const competidor of conDatos(comparacion.competitors)) {
      for (const fila of comparacion.rows) {
        const celda = fila.matches[competidor.id];
        if (!entraEnPromedios(celda)) continue;
        const v = variacionDe(fila.ngr.price, celda.best.price);
        if (v == null) continue;
        salida.push({
          marca,
          competidor,
          fila,
          otro: celda.best.name,
          propio: fila.ngr.price,
          precioOtro: celda.best.price,
          variacion: v,
          tono: tonoDe(posicionDeProducto(fila.ngr.price, celda.best.price), modo),
        });
      }
    }
  }
  return salida;
}

/** Cómo se llama lo propio en cada modo: la marca, o el canal ancla entre canales. */
export function nombrePropio(c: Comparacion, marca: string): string {
  if (modoDe(c) === "competencia") return marca;
  return NOMBRE_DE_CANAL[c.anchorChannel ?? "propio"] ?? "Sitio propio";
}
