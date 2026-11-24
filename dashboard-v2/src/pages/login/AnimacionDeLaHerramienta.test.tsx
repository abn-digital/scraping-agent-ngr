import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimacionDeLaHerramienta, ESCENAS, MS_POR_ESCENA } from "./AnimacionDeLaHerramienta";

// motion guarda la preferencia del sistema la primera vez que la lee: para
// probar los dos casos en el mismo archivo, se controla desde acá.
let reducido = false;
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  useReducedMotion: () => reducido,
}));

const escena = () => screen.getByTestId("escena-actual").textContent;

describe("la animación del login", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    reducido = false;
  });

  it("da la vuelta sola por las cuatro escenas", () => {
    render(<AnimacionDeLaHerramienta />);
    expect(escena()).toBe(ESCENAS[0].titulo);
    act(() => void vi.advanceTimersByTime(MS_POR_ESCENA));
    expect(escena()).toBe(ESCENAS[1].titulo);
    // Cada escena arma su propio timer al montarse: se avanza de a una.
    for (const i of [2, 3, 0]) {
      act(() => void vi.advanceTimersByTime(MS_POR_ESCENA));
      expect(escena()).toBe(ESCENAS[i].titulo);
    }
  });

  it("con movimiento reducido se queda quieta en la comparativa", () => {
    reducido = true;
    render(<AnimacionDeLaHerramienta />);
    expect(escena()).toBe(ESCENAS[2].titulo);
    for (let i = 0; i < 4; i++) act(() => void vi.advanceTimersByTime(MS_POR_ESCENA));
    expect(escena()).toBe(ESCENAS[2].titulo);
  });

  it("tocar un paso la detiene ahí", () => {
    render(<AnimacionDeLaHerramienta />);
    fireEvent.click(screen.getByRole("button", { name: `4. ${ESCENAS[3].titulo}` }));
    expect(escena()).toBe(ESCENAS[3].titulo);
    for (let i = 0; i < 4; i++) act(() => void vi.advanceTimersByTime(MS_POR_ESCENA));
    expect(escena()).toBe(ESCENAS[3].titulo);
  });
});
