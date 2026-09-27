import { describe, expect, it } from "vitest";
import { cn } from "./cn";

// En creativos, tailwind-merge sin configurar tomaba text-meta por un color y
// lo borraba al lado de un text-ink: varios componentes pedían un tamaño que
// nunca llegaba a la pantalla. Esto no puede volver a pasar sin que salte.
describe("cn con la escala del sistema", () => {
  it("un tamaño propio convive con un color", () => {
    expect(cn("text-meta", "text-ink-3")).toBe("text-meta text-ink-3");
    expect(cn("font-mono text-micro tnum", "text-stage-3")).toBe(
      "font-mono text-micro tnum text-stage-3",
    );
  });

  it("dos tamaños o dos colores se resuelven: gana el último", () => {
    expect(cn("text-meta", "text-lede")).toBe("text-lede");
    expect(cn("text-ink-3", "text-ember")).toBe("text-ember");
  });

  it("radios y sombras propios también se resuelven", () => {
    expect(cn("rounded-control", "rounded-panel")).toBe("rounded-panel");
    expect(cn("shadow-card", "shadow-lift")).toBe("shadow-lift");
  });
});
