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

/**
 * Lo mismo, de arriba abajo: si una columna con scroll tiene algo cortado
 * arriba o abajo. Lo usa el riel, que con muchas secciones no entra en una
 * pantalla de 900 px y sin aviso las últimas no existen para quien mira.
 */
export function useDesbordeVertical<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  arriba: boolean;
  abajo: boolean;
} {
  const ref = useRef<T>(null);
  const [bordes, setBordes] = useState({ arriba: false, abajo: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const medir = (): void => {
      const { scrollTop, clientHeight, scrollHeight } = el;
      setBordes({ arriba: scrollTop > 1, abajo: scrollTop + clientHeight < scrollHeight - 1 });
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
