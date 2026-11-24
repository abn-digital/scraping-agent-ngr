import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, type ReactNode } from "react";
import { useNavigate, type NavigateFunction } from "react-router";
import { alPerderLaSesion, enviar, pedir } from "./api";
import { statusOf } from "./errors";
import { MARCAS_NGR, TIENDAS, type MarcaNgr, type TiendaConocida } from "./tiendas";

// La sesión de quien usa la app: quién es, qué rol tiene y qué marcas ve.
// El server es la verdad (cada /api ya filtra); esto recorta las listas del
// cliente para que no aparezcan marcas ajenas ni un instante.

export type Rol = "viewer" | "reviewer" | "admin";

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  /** Vacío para un admin: ve todas. */
  marcas: string[];
  mustChangePassword: boolean;
  activo: boolean;
  createdAt: string | null;
  passwordChangedAt: string | null;
}

export const NOMBRE_DE_ROL: Record<Rol, string> = {
  viewer: "Lectura",
  reviewer: "Revisión",
  admin: "Admin",
};

export const claveDeSesion = ["sesion"] as const;

/** La base de la v2 ("/v2"): un `next` que empieza así es de esta app. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function pedirSesion(): Promise<Usuario | null> {
  try {
    // Sin sesión, el back contesta { usuario: null } y no un 401.
    const r = await pedir<{ usuario: Usuario | null }>(
      "/api/auth/me",
      undefined,
      "No se pudo cargar tu cuenta.",
    );
    return r.usuario ?? null;
  } catch (e) {
    if (statusOf(e) === 401) return null;
    throw e;
  }
}

export function useSesion() {
  return useQuery({
    queryKey: claveDeSesion,
    queryFn: pedirSesion,
    staleTime: Infinity,
    retry: false,
  });
}

/** Adentro de las rutas con sesión, la cuenta está siempre. */
export function useUsuario(): Usuario {
  const { data } = useSesion();
  if (!data) throw new Error("useUsuario fuera de una ruta con sesión");
  return data;
}

/** Las cuentas de este dominio son siempre admin (el server lo hace cumplir). */
export const DOMINIO_ADMIN = "abndigital.com.ar";
export const esDelDominioAdmin = (email: string) =>
  email.trim().toLowerCase().endsWith(`@${DOMINIO_ADMIN}`);

export const esAdmin = (u: Usuario | null | undefined) => u?.rol === "admin";
export const puedeRevisar = (u: Usuario | null | undefined) =>
  u?.rol === "reviewer" || u?.rol === "admin";

export function marcasDe(u: Usuario | null | undefined): MarcaNgr[] {
  if (!u) return [];
  return u.rol === "admin" ? MARCAS_NGR : MARCAS_NGR.filter((m) => u.marcas.includes(m.key));
}

/** Las marcas que la cuenta ve, en el orden de siempre. */
export function useMisMarcas(): MarcaNgr[] {
  const { data } = useSesion();
  return useMemo(() => marcasDe(data), [data]);
}

/** Las tiendas conocidas de esas marcas (la propia y su competencia). */
export function useMisTiendas(): TiendaConocida[] {
  const marcas = useMisMarcas();
  return useMemo(() => {
    const keys = new Set(marcas.map((m) => m.key));
    return TIENDAS.filter((t) => keys.has(t.marca));
  }, [marcas]);
}

/**
 * Engancha la API con la sesión: un 401 en cualquier consulta deja la sesión
 * en nada (y la ruta lleva al login); un 403 por la clave de un uso la vuelve
 * a pedir (y la ruta lleva a cambiarla).
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  useEffect(() => {
    alPerderLaSesion((motivo) => {
      if (motivo === "sin-sesion") {
        qc.setQueryData(claveDeSesion, null);
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== claveDeSesion[0] });
      } else {
        void qc.invalidateQueries({ queryKey: claveDeSesion });
      }
    });
    return () => alPerderLaSesion(null);
  }, [qc]);
  return children;
}

/** Un `next` seguro: una ruta del mismo origen, nunca "//otro.sitio". */
export function nextSeguro(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\"))
    return null;
  return next;
}

export type Destino = { tipo: "interno"; ruta: string } | { tipo: "externo"; url: string };

/**
 * A dónde ir después de entrar. Un `next` de la v2 (/v2/…) navega adentro; uno
 * de la v1 (la raíz) recarga allá, que es otra app.
 */
export function destinoDe(next: string | null | undefined): Destino {
  const seguro = nextSeguro(next);
  if (seguro && seguro !== BASE && !seguro.startsWith(`${BASE}/`))
    return { tipo: "externo", url: seguro };
  const adentro = seguro ? seguro.slice(BASE.length) || "/" : "/";
  return { tipo: "interno", ruta: /^\/(login|cambiar-clave)\b/.test(adentro) ? "/" : adentro };
}

export function irAlDestino(next: string | null | undefined, navigate: NavigateFunction) {
  const d = destinoDe(next);
  if (d.tipo === "externo") window.location.assign(d.url);
  else navigate(d.ruta, { replace: true });
}

export function useEntrar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { email: string; password: string }) =>
      enviar<{ usuario: Usuario }>("/api/auth/login", d, "No se pudo entrar. Probá de nuevo."),
    // El error se muestra en el formulario, no en un aviso.
    meta: { silent: true },
    onSuccess: ({ usuario }) => {
      // Lo que quedó en caché era de otra cuenta, o de ninguna.
      qc.clear();
      qc.setQueryData(claveDeSesion, usuario);
    },
  });
}

export function useCambiarClave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { actual: string; nueva: string }) =>
      enviar<{ usuario: Usuario }>(
        "/api/auth/change-password",
        d,
        "No se pudo cambiar la clave. Probá de nuevo.",
      ),
    meta: { silent: true },
    onSuccess: ({ usuario }) => qc.setQueryData(claveDeSesion, usuario),
  });
}

export function useSalir() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    try {
      await enviar("/api/auth/logout", {}, "No se pudo cerrar la sesión.");
    } catch {}
    // Primero salir de las rutas con sesión: si no, la guardia ve la sesión
    // vacía y manda al login con un `next` a la pantalla que se dejó.
    navigate("/login", { replace: true });
    qc.clear();
    qc.setQueryData(claveDeSesion, null);
  };
}
