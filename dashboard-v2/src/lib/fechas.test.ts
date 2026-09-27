import { describe, expect, it } from "vitest";
import { relativo } from "./fechas";

const AHORA = Date.parse("2026-09-25T12:00:00Z");
const en = (min: number) => new Date(AHORA + min * 60_000).toISOString();

describe("fechas relativas", () => {
  it("el pasado", () => {
    expect(relativo(en(0), AHORA)).toBe("recién");
    expect(relativo(en(-5), AHORA)).toBe("hace 5 min");
    expect(relativo(en(-180), AHORA)).toBe("hace 3 h");
    expect(relativo(en(-3 * 24 * 60), AHORA)).toBe("hace 3 d");
  });

  it("el futuro: una invitación vence en 7 d, no 'recién'", () => {
    expect(relativo(en(7 * 24 * 60), AHORA)).toBe("en 7 d");
    expect(relativo(en(90), AHORA)).toBe("en 2 h");
  });
});
