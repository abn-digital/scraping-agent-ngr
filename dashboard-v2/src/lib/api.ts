import { ErrorDeUsuario } from "./errors";

// La API es la de la v1, en el mismo origen: /api/… sirve igual desde la raíz
// que desde /v2. En desarrollo, Vite la reenvía a PROXY_API.
//
// El back escribe la mayoría de sus mensajes en castellano para quien usa la
// app ("Actualización manual de PedidosYa deshabilitada…"), pero algunos son
// técnicos y en inglés ("Scraper execution failed") y los 500 suelen traer el
// mensaje crudo de una excepción. Por eso: el mensaje del back se muestra en
// los 4xx, salvo los técnicos de esta lista; en los 5xx va el respaldo de
// quien llama, que dice qué no se pudo hacer.
const TECNICOS =
  /^(failed|url is required|scraper execution|run not found|storeid|unauthorized|no data found|brand y channel|brand\/channel|action inválida|id requerido)/i;

type Parametros = Record<string, string | number | null | undefined>;

// Toda la API pide sesión. Cuando una respuesta dice que la sesión ya no vale
// (401) o que falta cambiar la clave (403 MUST_CHANGE_PASSWORD), la capa de
// sesión (lib/sesion.tsx) se entera por acá y decide a dónde ir. Las rutas de
// auth no avisan: el login con clave equivocada es un 401 que se muestra en el
// formulario, y /me es la que la sesión misma consulta.
type AvisoDeSesion = (motivo: "sin-sesion" | "cambiar-clave") => void;
let avisoDeSesion: AvisoDeSesion | null = null;

export function alPerderLaSesion(fn: AvisoDeSesion | null): void {
  avisoDeSesion = fn;
}

const SIN_AVISO = /^\/api\/auth\/(login|me|change-password)\b/;

function conParametros(ruta: string, params?: Parametros): string {
  if (!params) return ruta;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${ruta}?${s}` : ruta;
}

async function leer<T>(respuesta: Response, respaldo: string, ruta: string): Promise<T> {
  let cuerpo: unknown = null;
  try {
    cuerpo = await respuesta.json();
  } catch {}
  if (respuesta.ok) return cuerpo as T;

  const delBack =
    cuerpo && typeof cuerpo === "object" && "error" in cuerpo
      ? String((cuerpo as { error: unknown }).error ?? "")
      : "";
  const codigo =
    cuerpo && typeof cuerpo === "object" && "code" in cuerpo
      ? String((cuerpo as { code: unknown }).code ?? "")
      : undefined;
  if (!SIN_AVISO.test(ruta)) {
    if (respuesta.status === 401) avisoDeSesion?.("sin-sesion");
    else if (respuesta.status === 403 && codigo === "MUST_CHANGE_PASSWORD")
      avisoDeSesion?.("cambiar-clave");
  }
  const usar =
    respuesta.status < 500 && delBack && !TECNICOS.test(delBack.trim()) ? delBack : respaldo;
  throw new ErrorDeUsuario(usar, respuesta.status, codigo || undefined, cuerpo);
}

async function llamar<T>(ruta: string, init: RequestInit, respaldo: string): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...init,
      // Mismo origen: la cookie de sesión viaja igual, pero lo dejamos dicho.
      credentials: "include",
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new ErrorDeUsuario("No se pudo conectar con el servidor.");
  }
  return leer<T>(respuesta, respaldo, ruta);
}

export function pedir<T>(
  ruta: string,
  params?: Parametros,
  respaldo = "No se pudo cargar.",
): Promise<T> {
  return llamar<T>(conParametros(ruta, params), { method: "GET" }, respaldo);
}

export function enviar<T>(
  ruta: string,
  cuerpo: unknown,
  respaldo: string,
  metodo: "POST" | "PATCH" = "POST",
): Promise<T> {
  return llamar<T>(
    ruta,
    {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    },
    respaldo,
  );
}
