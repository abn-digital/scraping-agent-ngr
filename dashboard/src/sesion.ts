import { createContext, useContext } from 'react';

// Tipos y hooks de la sesión de la v1 (el componente que la arma está en auth.tsx).

export type Rol = 'viewer' | 'reviewer' | 'admin';

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  marcas: string[];
  mustChangePassword: boolean;
}

export const NOMBRE_DE_ROL: Record<Rol, string> = { viewer: 'Lectura', reviewer: 'Revisión', admin: 'Admin' };

/** "Papa Johns", "Dunkin'", "Don Belisario" → la clave de brand_config ("papajohns", "dunkin", "donbelisario"). */
export const claveDeMarca = (label: string) =>
  label.normalize('NFD').replace(/[^a-zA-Z]/g, '').toLowerCase();

export interface Sesion {
  usuario: Usuario;
  puedeRevisar: boolean;
  esAdmin: boolean;
  veMarca: (labelOClave: string) => boolean;
  salir: () => Promise<void>;
  cambiarClave: () => void;
}

export const Ctx = createContext<Sesion | null>(null);

export function useSesion(): Sesion {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSesion fuera de <AuthGate>');
  return s;
}


/** Las cuentas de este dominio son siempre admin (el server lo hace cumplir). */
export const DOMINIO_ADMIN = 'abndigital.com.ar';
export const esDelDominioAdmin = (email: string) =>
  email.trim().toLowerCase().endsWith(`@${DOMINIO_ADMIN}`);
