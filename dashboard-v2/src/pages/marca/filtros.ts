import { categoriaDe } from "@/lib/precios";
import type { FilaDeCruce } from "@/lib/tipos";

const plegar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** La búsqueda de la v1: por nombre o por categoría del producto propio. */
export function coincide(fila: FilaDeCruce, q: string): boolean {
  const aguja = plegar(q.trim());
  if (!aguja) return true;
  return plegar(fila.ngr.name).includes(aguja) || plegar(fila.ngr.category ?? "").includes(aguja);
}

export function filtrarFilas<T extends FilaDeCruce>(
  filas: T[],
  { q, categorias }: { q: string; categorias: string[] },
): T[] {
  const cats = new Set(categorias);
  return filas.filter(
    (f) => coincide(f, q) && (cats.size === 0 || cats.has(categoriaDe(f.ngr.category))),
  );
}

export function categoriasDe(filas: FilaDeCruce[]): string[] {
  return [...new Set(filas.map((f) => categoriaDe(f.ngr.category)))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
}
