import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

// Irse con cambios sin guardar los perdería. Cerrar la pestaña lo avisa el
// navegador; un link de la app (el riel, "volver", una miga) pasa por la
// confirmación. Se escucha el clic en todo el documento porque useBlocker no
// existe en el modo declarativo de react-router, y así ningún link se escapa.
// Un clic con modificador abre otra pestaña: eso no es irse, y pasa derecho.
//
// El href de un link ya trae el basename de la app (/v2) y navigate() se lo
// vuelve a poner: sin sacárselo, "Salir sin guardar" llevaba a /v2/v2/….
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** "/v2/marcas/x" → "/marcas/x". Una ruta fuera de la app queda como está. */
export function sinBasename(pathname: string, base = BASE): string {
  if (!base) return pathname;
  if (pathname === base) return "/";
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
}

export function useCambiosSinGuardar(sucio: boolean) {
  const navigate = useNavigate();
  const [porDejar, setPorDejar] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!sucio) return;

    const alCerrar = (e: BeforeUnloadEvent) => e.preventDefault();
    const alClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("download"))
        return;
      const destino = new URL(a.href);
      if (destino.origin !== window.location.origin) return;
      e.preventDefault();
      setPorDejar(
        () => () => void navigate(sinBasename(destino.pathname) + destino.search + destino.hash),
      );
    };

    window.addEventListener("beforeunload", alCerrar);
    document.addEventListener("click", alClic, true);
    return () => {
      window.removeEventListener("beforeunload", alCerrar);
      document.removeEventListener("click", alClic, true);
    };
  }, [sucio, navigate]);

  return {
    // Para salidas que no son un link: un botón que navega, cambiar de pestaña.
    alSalir: (irse: () => void) => (sucio ? setPorDejar(() => irse) : irse()),
    confirmacion: {
      open: porDejar !== null,
      onOpenChange: (abierto: boolean) => !abierto && setPorDejar(null),
      onConfirm: () => {
        const irse = porDejar;
        setPorDejar(null);
        irse?.();
      },
    },
  };
}
