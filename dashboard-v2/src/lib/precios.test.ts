import { describe, expect, it } from "vitest";
import {
  distribucion,
  fraseDePromedio,
  posicionDeProducto,
  resumir,
  tramoDe,
  variacionDe,
} from "./precios";
import type { Celda, FilaDeCruce } from "./tipos";

const celda = (price: number | null, status: Celda["status"] = "auto"): Celda => ({
  best: price == null ? null : { name: "x", category: "", price, score: 90 },
  alternatives: [],
  status,
  delta: null,
  deltaPct: null,
  edited: false,
});
const fila = (precio: number, otro: Celda): FilaDeCruce => ({
  ngr: { name: `p${precio}`, category: "C", price: precio },
  matches: { c: otro },
});

describe("variacionDe", () => {
  it("es propio contra el otro, como fracción", () => {
    expect(variacionDe(11, 10)).toBeCloseTo(0.1);
    expect(variacionDe(9, 10)).toBeCloseTo(-0.1);
  });
  it("sin precio del otro no hay variación", () => {
    expect(variacionDe(10, null)).toBeNull();
    expect(variacionDe(10, 0)).toBeNull();
    expect(variacionDe(0, 10)).toBeNull();
  });
});

describe("resumir", () => {
  it("cuenta como el back y promedia como la v1", () => {
    const filas = [
      fila(11, celda(10)), // +10 %, más caro
      fila(9, celda(10)), // −10 %, más barato
      fila(10, celda(10.03)), // similar (menos de S/ 0,05)
      fila(20, celda(10, "pending")), // a revisar: no entra
      fila(20, celda(null, "rejected")), // sin equivalente
    ];
    const r = resumir(filas, "c");
    expect(r.productos).toBe(3);
    expect(r.masCaro).toBe(1);
    expect(r.masBarato).toBe(1);
    expect(r.similar).toBe(1);
    expect(r.aRevisar).toBe(1);
    expect(r.sinEquivalente).toBe(1);
    expect(r.promedio).toBeCloseTo((0.1 - 0.1 + (10 - 10.03) / 10.03) / 3);
    expect(r.indice).toBeCloseTo(30 / 30.03);
  });
  it("sin cruces no hay promedio", () => {
    expect(resumir([], "c").promedio).toBeNull();
  });
});

describe("posiciones y tramos", () => {
  it("usa el umbral de S/ 0,05 del back", () => {
    expect(posicionDeProducto(10.05, 10)).toBe("similar");
    expect(posicionDeProducto(10.06, 10)).toBe("caro");
    expect(posicionDeProducto(9.9, 10)).toBe("barato");
  });
  it("reparte en tramos cerrados", () => {
    expect(tramoDe(-0.5)).toBe(0);
    expect(tramoDe(0)).toBe(3);
    expect(tramoDe(0.02)).toBe(3);
    expect(tramoDe(0.3)).toBe(6);
    // El borde va al tramo de arriba: +10 % exacto es "+10 a +25".
    expect(tramoDe(0.1)).toBe(5);
    expect(distribucion([fila(10.5, celda(10)), fila(15, celda(10))], "c")).toEqual([
      0, 0, 0, 0, 1, 0, 1,
    ]);
  });
  it("dice la posición en palabras", () => {
    expect(fraseDePromedio(0.12, "Bembos", "KFC")).toMatch(
      /^En promedio, Bembos está 12\s?% más caro que KFC\.$/,
    );
    expect(fraseDePromedio(0.001, "Bembos", "KFC")).toBe("Bembos tiene precios similares a KFC.");
  });
});
