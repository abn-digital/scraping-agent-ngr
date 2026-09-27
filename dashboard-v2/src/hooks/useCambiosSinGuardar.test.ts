import { describe, expect, it } from "vitest";
import { sinBasename } from "./useCambiosSinGuardar";

describe("sinBasename", () => {
  it("le saca el basename a un link de la app", () => {
    expect(sinBasename("/v2/marcas/x", "/v2")).toBe("/marcas/x");
    expect(sinBasename("/v2", "/v2")).toBe("/");
    expect(sinBasename("/otra", "/v2")).toBe("/otra");
    expect(sinBasename("/v2x/a", "/v2")).toBe("/v2x/a");
  });
});
