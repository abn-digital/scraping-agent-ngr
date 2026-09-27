import { useEffect } from "react";
import { PRODUCTO } from "@/producto";

// El título de la pestaña es lo primero que anuncia un lector de pantalla al
// cambiar de pantalla, y lo que distingue dos pestañas de la misma app. Al
// salir vuelve al nombre del producto: una pantalla sin título no hereda el de
// la anterior.
export function useTituloDePagina(titulo: string | undefined) {
  useEffect(() => {
    if (!titulo) return;
    document.title = `${titulo} · ${PRODUCTO.nombre}`;
    return () => {
      document.title = PRODUCTO.nombre;
    };
  }, [titulo]);
}
