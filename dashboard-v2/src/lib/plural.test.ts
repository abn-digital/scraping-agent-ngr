import { describe, expect, it } from "vitest";
import { plural } from "./plural";

describe("plural", () => {
  it("una sola cosa va en singular: nunca '1 notas'", () => {
    expect(plural(1, "nota")).toBe("1 nota");
  });

  it("cero y muchas van en plural", () => {
    expect(plural(0, "nota")).toBe("0 notas");
    expect(plural(12, "nota")).toBe("12 notas");
  });

  it("acepta el plural que no es agregar una s", () => {
    expect(plural(2, "imagen", "imágenes")).toBe("2 imágenes");
  });
});
