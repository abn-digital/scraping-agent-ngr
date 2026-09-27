import { useEffect, useRef, useState, type RefObject } from "react";

export function useDesborde<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  inicio: boolean;
  fin: boolean;
} {
  const ref = useRef<T>(null);
  const [bordes, setBordes] = useState({ inicio: false, fin: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const medir = (): void => {
      const { scrollLeft, clientWidth, scrollWidth } = el;
      // Un píxel de tolerancia: con zoom del browser las medidas son
      // fraccionarias y el final nunca daba exacto, así que el degradado de la
      // derecha quedaba prendido para siempre.
      setBordes({
        inicio: scrollLeft > 1,
        fin: scrollLeft + clientWidth < scrollWidth - 1,
      });
    };

    medir();
    el.addEventListener("scroll", medir, { passive: true });

    const observador = new ResizeObserver(medir);
    observador.observe(el);
    for (const hijo of Array.from(el.children)) observador.observe(hijo);

    return () => {
      el.removeEventListener("scroll", medir);
      observador.disconnect();
    };
  }, []);

  return { ref, ...bordes };
}
