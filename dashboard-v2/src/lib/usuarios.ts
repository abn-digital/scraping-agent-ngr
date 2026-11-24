import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enviar, pedir } from "./api";
import type { Rol, Usuario } from "./sesion";

// Las cuentas, para el panel de Usuarios (solo admin). La clave de un uso
// llega únicamente en el alta y en el reset: ningún GET la trae.

const clave = ["usuarios"] as const;

export function useUsuarios() {
  return useQuery({
    queryKey: clave,
    queryFn: () =>
      pedir<{ usuarios: Usuario[] }>(
        "/api/auth/users",
        undefined,
        "No se pudo cargar la lista de cuentas.",
      ).then((r) => r.usuarios),
  });
}

export interface DatosDeCuenta {
  email: string;
  nombre: string;
  rol: Rol;
  marcas: string[];
}

export function useCrearCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DatosDeCuenta) =>
      enviar<{ usuario: Usuario; clave: string }>(
        "/api/auth/users",
        d,
        "No se pudo crear la cuenta.",
      ),
    // El error se muestra en la hoja, junto al campo.
    meta: { silent: true },
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
  });
}

export function useEditarCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...cambios
    }: { id: string } & Partial<Omit<DatosDeCuenta, "email">> & { activo?: boolean }) =>
      enviar<{ usuario: Usuario }>(
        `/api/auth/users/${encodeURIComponent(id)}`,
        cambios,
        "No se pudo guardar el cambio.",
        "PATCH",
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
  });
}

export function useResetearClave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      enviar<{ usuario: Usuario; clave: string }>(
        `/api/auth/users/${encodeURIComponent(id)}/reset`,
        {},
        "No se pudo resetear la clave.",
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: clave }),
  });
}
