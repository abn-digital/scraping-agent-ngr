import { useCallback } from "react";
import { useSearchParams } from "react-router";

type Cambio = string | string[] | null | undefined;

/**
 * El estado de una pantalla vive en la URL (filtros, búsqueda, lo abierto).
 * `poner` cambia varios parámetros de una vez y saca los vacíos, para que un
 * filtro en su valor por defecto no ensucie el enlace. Reemplaza la entrada
 * del historial: "volver" lleva a la pantalla anterior, no al filtro anterior.
 */
export function useParametros() {
  const [params, setParams] = useSearchParams();
  const poner = useCallback(
    (cambios: Record<string, Cambio>) => {
      setParams(
        (prev) => {
          const sig = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(cambios)) {
            sig.delete(k);
            if (Array.isArray(v)) v.forEach((x) => sig.append(k, x));
            else if (v != null && v !== "") sig.set(k, v);
          }
          return sig;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  return [params, poner] as const;
}
