import { toast, type ExternalToast } from "sonner";

const MAXIMO = 3;

/**
 * Los avisos de la app.
 *
 * Dos reglas, las dos por el mismo motivo: que la esquina no se convierta en
 * una torre. El id es el propio texto, así el mismo mensaje repetido reemplaza
 * al anterior en vez de sumarse. Y cuando llega uno nuevo con la pila llena, se
 * va el más viejo.
 *
 * El tope lo lleva esto y no `visibleToasts`: con `unstyled`, sonner deja de
 * aplicar su apilado y los que deberían quedar atrás se dibujan uno arriba del
 * otro hasta la mitad de la pantalla.
 */
const enPantalla: string[] = [];

function registrar(id: string): void {
  const repetido = enPantalla.indexOf(id);
  if (repetido >= 0) enPantalla.splice(repetido, 1);
  enPantalla.push(id);

  while (enPantalla.length > MAXIMO) {
    const viejo = enPantalla.shift();
    if (viejo !== undefined) toast.dismiss(viejo);
  }
}

const mostrar =
  (tipo: "success" | "error" | "info") => (mensaje: string, opciones?: ExternalToast) => {
    registrar(mensaje);
    return toast[tipo](mensaje, { id: mensaje, ...opciones });
  };

export const aviso = {
  ok: mostrar("success"),
  error: mostrar("error"),
  info: mostrar("info"),
};
