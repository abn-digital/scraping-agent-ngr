import { PRODUCTO } from "@/producto";

// La última marca que se miró en la comparativa, para que "Comparativa" en el
// riel vuelva a ella. Sin localStorage (modo privado, bloqueado) se sigue sin
// recordar: abre la primera.
const CLAVE = `${PRODUCTO.slug}:ultima-marca`;

export function ultimaMarca(porDefecto = "bembos"): string {
  try {
    return localStorage.getItem(CLAVE) || porDefecto;
  } catch {
    return porDefecto;
  }
}

export function recordarMarca(marca: string): void {
  try {
    localStorage.setItem(CLAVE, marca);
  } catch {}
}
