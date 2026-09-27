import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiferido } from "./useDiferido";

describe("el valor diferido", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("arranca con el valor que le dan", () => {
    expect(renderHook(() => useDiferido("zap")).result.current).toBe("zap");
  });

  it("no lo suelta hasta que pasa la espera", () => {
    const { result, rerender } = renderHook(({ v }) => useDiferido(v, 300), {
      initialProps: { v: "z" },
    });

    rerender({ v: "za" });
    act(() => void vi.advanceTimersByTime(299));
    expect(result.current).toBe("z");

    act(() => void vi.advanceTimersByTime(1));
    expect(result.current).toBe("za");
  });

  it("escribir de nuevo reinicia la espera: una sola consulta, no una por tecla", () => {
    const { result, rerender } = renderHook(({ v }) => useDiferido(v, 300), {
      initialProps: { v: "z" },
    });

    for (const v of ["za", "zap", "zapa"]) {
      rerender({ v });
      act(() => void vi.advanceTimersByTime(200));
    }
    expect(result.current).toBe("z");

    act(() => void vi.advanceTimersByTime(300));
    expect(result.current).toBe("zapa");
  });
});
