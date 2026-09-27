import { useEffect, useRef } from "react";

// Una marca al final de la grilla que pide la tanda siguiente al acercarse. Se
// adelanta 800 px al hueco para que la pantalla no quede en blanco un instante
// al terminar el scroll.
export function useCentinela(pedirMas: () => void, activo: boolean) {
  const marca = useRef<HTMLDivElement>(null);
  const pedir = useRef(pedirMas);

  useEffect(() => {
    pedir.current = pedirMas;
  });

  useEffect(() => {
    const el = marca.current;
    if (!el || !activo) return;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) pedir.current();
      },
      { rootMargin: "800px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [activo]);

  return marca;
}
