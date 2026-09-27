import {
  keepPreviousData,
  useIsMutating,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { enviar, pedir } from "./api";
import { aviso } from "./avisos";
import { statusOf } from "./errors";
import { urlDeActualizacion } from "./tiendas";
import type {
  Canal,
  Comparacion,
  CorridaConProductos,
  Decision,
  FechasDeCruce,
  Historial,
  Marca,
  Producto,
  ProductoCruzado,
  Tienda,
} from "./tipos";

// Cada endpoint de la v1, como consulta de TanStack Query. Los contratos no
// cambian: mismas rutas, mismos parámetros, mismas respuestas.

export const claves = {
  resultados: ["resultados"] as const,
  marcas: ["marcas"] as const,
  comparacion: (marca: string, canal: Canal, fecha?: string | null) =>
    ["comparacion", marca, canal, fecha ?? null] as const,
  fechas: (marca: string, canal: Canal) => ["fechas", marca, canal] as const,
  catalogo: (id: string) => ["catalogo", id] as const,
  historial: (id: string) => ["historial", id] as const,
  corrida: (id: string, at: string) => ["corrida", id, at] as const,
};

/** GET /api/results: todas las tiendas con su catálogo vigente. */
export function useResultados() {
  return useQuery({
    queryKey: claves.resultados,
    queryFn: () =>
      pedir<Tienda[]>("/api/results", undefined, "No se pudieron cargar los catálogos."),
    staleTime: 5 * 60_000,
  });
}

/** GET /api/brands */
export function useMarcas() {
  return useQuery({
    queryKey: claves.marcas,
    queryFn: () =>
      pedir<Marca[]>("/api/brands", undefined, "No se pudo cargar la lista de marcas."),
    staleTime: 10 * 60_000,
  });
}

/** GET /api/matches. Sin cruce (404) no es un error: todavía no corrió el job diario. */
async function pedirComparacion(marca: string, canal: Canal, fecha?: string | null) {
  try {
    return await pedir<Comparacion>(
      "/api/matches",
      { brand: marca, channel: canal, date: fecha ?? undefined },
      "No se pudo cargar la comparativa.",
    );
  } catch (e) {
    if (statusOf(e) === 404) return null;
    throw e;
  }
}

/**
 * `existe` es el hasMatches de /api/brands: si ya se sabe que no hay cruce, no
 * se pide (el 404 ensuciaba la consola). Un día guardado se pide igual.
 */
export function useComparacion(
  marca: string | undefined,
  canal: Canal,
  fecha?: string | null,
  existe = true,
) {
  const q = useQuery({
    queryKey: claves.comparacion(marca ?? "", canal, fecha),
    queryFn: () => pedirComparacion(marca!, canal, fecha),
    enabled: !!marca && (existe || !!fecha),
  });
  const sabidoVacio = !!marca && !existe && !fecha;
  return sabidoVacio ? { ...q, data: null, isLoading: false } : q;
}

/** Varias comparativas a la vez: el resumen y la revisión miran todas las marcas. */
export function useComparaciones(pares: { marca: string; canal: Canal; fecha?: string | null }[]) {
  return useQueries({
    queries: pares.map(({ marca, canal, fecha }) => ({
      queryKey: claves.comparacion(marca, canal, fecha),
      queryFn: () => pedirComparacion(marca, canal, fecha),
    })),
  });
}

/** GET /api/matches/dates: los días con snapshot del cruce, del más nuevo al más viejo. */
export function useFechas(marca: string | undefined, canal: Canal) {
  return useQuery({
    queryKey: claves.fechas(marca ?? "", canal),
    queryFn: () =>
      pedir<FechasDeCruce>(
        "/api/matches/dates",
        { brand: marca, channel: canal },
        "No se pudieron cargar las fechas del cruce.",
      ),
    enabled: !!marca,
  });
}

/** GET /api/catalog: el catálogo completo de un competidor, para elegir el equivalente. */
export function useCatalogo(id: string | undefined) {
  return useQuery({
    queryKey: claves.catalogo(id ?? ""),
    queryFn: () =>
      pedir<Producto[]>("/api/catalog", { id }, "No se pudo cargar el catálogo del competidor."),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}

/** GET /api/history/:storeId */
export function useHistorial(id: string | undefined) {
  return useQuery({
    queryKey: claves.historial(id ?? ""),
    queryFn: () =>
      pedir<Historial>(
        `/api/history/${encodeURIComponent(id!)}`,
        undefined,
        "No se pudo cargar el historial.",
      ),
    enabled: !!id,
  });
}

const pedirCorrida = (id: string, at: string) =>
  pedir<CorridaConProductos>(
    `/api/history/${encodeURIComponent(id)}/run`,
    { at },
    "No se pudo cargar esa corrida.",
  );

/**
 * GET /api/history/:storeId/run: el catálogo de una corrida guardada. Al pasar
 * de una corrida a otra se queda con la anterior mientras llega la nueva
 * (`mantener`), salvo para cuentas que no pueden mezclar dos corridas.
 */
export function useCorrida(
  id: string | undefined,
  at: string | null | undefined,
  { mantener = true }: { mantener?: boolean } = {},
) {
  return useQuery({
    queryKey: claves.corrida(id ?? "", at ?? ""),
    queryFn: () => pedirCorrida(id!, at!),
    enabled: !!id && !!at,
    placeholderData: mantener ? keepPreviousData : undefined,
    // Una corrida guardada no cambia nunca.
    staleTime: Infinity,
  });
}

export function useCorridas(id: string | undefined, ats: string[]) {
  return useQueries({
    queries: ats.map((at) => ({
      queryKey: claves.corrida(id ?? "", at),
      queryFn: () => pedirCorrida(id!, at),
      enabled: !!id,
      staleTime: Infinity,
    })),
  });
}

/**
 * POST /api/update: vuelve a leer el catálogo con su scraper. Tarda (hasta
 * cinco minutos en los sitios pesados), así que la clave de la mutación deja
 * saber que sigue en curso aunque se cambie de pantalla y se vuelva.
 */
export function useActualizarTienda(id: string, nombre: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["actualizar", id],
    mutationFn: () =>
      enviar<{ message: string }>(
        "/api/update",
        { url: urlDeActualizacion(id) },
        "No se pudo actualizar el catálogo. El scraper falló o tardó demasiado; probá de nuevo en unos minutos.",
      ),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: claves.resultados }),
        qc.invalidateQueries({ queryKey: claves.historial(id) }),
      ]);
      aviso.ok(`Se actualizó el catálogo de ${nombre}`);
    },
  });
}

export const useActualizando = (id: string) =>
  useIsMutating({ mutationKey: ["actualizar", id] }) > 0;

export interface PedidoDeDecision {
  ngrName: string;
  competitorId: string;
  action: Decision;
  product?: ProductoCruzado;
}

/** POST /api/matches/override: la decisión de una persona sobre un cruce. */
export function useDecision(marca: string, canal: Canal) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: PedidoDeDecision) =>
      enviar<{ message: string; data: Comparacion }>(
        "/api/matches/override",
        { brand: marca, channel: canal, ...d },
        "No se pudo guardar la decisión. El cruce quedó como estaba.",
      ),
    onSuccess: (r) => {
      qc.setQueryData(claves.comparacion(marca, canal, null), r.data);
      // El resumen y la cola de revisión leen la misma comparativa: ya quedaron al día.
    },
  });
}
