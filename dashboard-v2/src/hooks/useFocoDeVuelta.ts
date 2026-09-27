import { useRef } from "react";

// Radix devuelve el foco solo a su Trigger, y los diálogos de la plantilla se
// abren controlados, sin Trigger: al cerrar, el foco caía en <body> y quien usa
// teclado o lector de pantalla quedaba al principio de la página. Se guarda lo
// que tenía el foco al abrir y se le devuelve al cerrar, si sigue en pantalla.
export function useFocoDeVuelta() {
  const previo = useRef<HTMLElement | null>(null);

  return {
    onOpenAutoFocus: () => {
      previo.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (e: Event) => {
      const el = previo.current;
      previo.current = null;
      if (el?.isConnected) {
        e.preventDefault();
        el.focus();
      }
    },
  };
}
