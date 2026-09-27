// Un error con un mensaje escrito para quien usa la app. Es lo único que se
// muestra tal cual: cualquier otro trae texto técnico, y en inglés.
export class ErrorDeUsuario extends Error {
  constructor(
    mensaje: string,
    readonly status?: number,
  ) {
    super(mensaje);
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  return err instanceof ErrorDeUsuario ? err.message : fallback;
}

export function statusOf(err: unknown): number | undefined {
  return err instanceof ErrorDeUsuario ? err.status : undefined;
}
