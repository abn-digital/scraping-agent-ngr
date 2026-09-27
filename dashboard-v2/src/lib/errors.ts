// Un error con un mensaje escrito para quien usa la app. Es lo único que se
// muestra tal cual: cualquier otro trae texto técnico, y en inglés.
//
// `codigo` y `datos` los suma la capa de datos (lib/api.ts): el código que
// manda el back para los casos que la pantalla trata aparte ("TOKEN_LIMIT"
// cuando la cuenta se quedó sin tokens) y el cuerpo entero de la respuesta,
// para las rutas que mandan algo más que el mensaje (las Pages que Meta
// rechazó, por ejemplo).
export class ErrorDeUsuario extends Error {
  constructor(
    mensaje: string,
    readonly status?: number,
    readonly codigo?: string,
    readonly datos?: unknown,
  ) {
    super(mensaje);
  }
}

/**
 * Un error de la API que no trae un mensaje para mostrar: el back no mandó
 * ninguno o mandó uno técnico en inglés. El texto lo pone quien lo muestra
 * (`errorMessage(err, "No se pudo cargar …")`), pero el status sigue
 * disponible para distinguir un 404 de un 500.
 */
export class ErrorSinMensaje extends Error {
  constructor(
    detalle: string,
    readonly status?: number,
    readonly codigo?: string,
    readonly datos?: unknown,
  ) {
    super(detalle);
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ErrorDeUsuario ? err.message : fallback;
}

export function statusOf(err: unknown): number | undefined {
  return err instanceof ErrorDeUsuario || err instanceof ErrorSinMensaje ? err.status : undefined;
}

export function codigoDe(err: unknown): string | undefined {
  return err instanceof ErrorDeUsuario || err instanceof ErrorSinMensaje ? err.codigo : undefined;
}

export function datosDe(err: unknown): unknown {
  return err instanceof ErrorDeUsuario || err instanceof ErrorSinMensaje ? err.datos : undefined;
}
