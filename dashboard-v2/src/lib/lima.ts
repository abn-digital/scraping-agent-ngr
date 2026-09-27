// Las fechas de los scrapes y de los cruces son de Perú: el "día" de una
// corrida es el día en Lima, como en la v1 (formatDate.ts), aunque quien mira
// esté en Buenos Aires. Se muestran en es-AR.
export const ZONA = "America/Lima";

const DIA = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HORA = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const CORTA = new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, day: "numeric", month: "short" });
const LARGA = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
});
// Un día suelto (AAAA-MM-DD) no tiene hora: se lee a mediodía UTC y se formatea
// en UTC, así ninguna zona lo corre al día anterior.
const DIA_CORTO = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const DIA_LARGO = new Intl.DateTimeFormat("es-AR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const sinPunto = (s: string) => s.replace(/\./g, "");
const valida = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "2026-09-24": la clave del día en Lima. */
export function diaLima(iso: string | Date): string {
  return DIA.format(iso instanceof Date ? iso : new Date(iso));
}

/** "14:05" en Lima. */
export function horaLima(iso: string): string {
  const d = valida(iso);
  return d ? HORA.format(d) : "—";
}

function mismoAnio(d: Date) {
  return diaLima(d).slice(0, 4) === diaLima(new Date()).slice(0, 4);
}

/** "24 sept" (con año si no es el actual). */
export function fechaLima(iso: string | null | undefined): string {
  const d = valida(iso);
  if (!d) return "—";
  return sinPunto((mismoAnio(d) ? CORTA : LARGA).format(d));
}

/** "24 sept, 13:49" en Lima. */
export function fechaHoraLima(iso: string | null | undefined): string {
  const d = valida(iso);
  if (!d) return "—";
  return `${fechaLima(iso)}, ${HORA.format(d)}`;
}

/** Un día AAAA-MM-DD como "24 sept". */
export function fechaDeDia(clave: string): string {
  const d = new Date(`${clave}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return clave;
  const actual = clave.slice(0, 4) === diaLima(new Date()).slice(0, 4);
  return sinPunto((actual ? DIA_CORTO : DIA_LARGO).format(d));
}

/** Días enteros desde un momento hasta ahora. */
export function diasDesde(iso: string | null | undefined, ahora = Date.now()): number | null {
  const d = valida(iso);
  if (!d) return null;
  return Math.floor((ahora - d.getTime()) / 86_400_000);
}

/**
 * Cuánto hace, redondeado a lo que se lee de un vistazo: "hoy", "hace 3 d",
 * "hace 5 sem", "hace 5 meses". Para decir si un catálogo está viejo.
 */
export function antiguedad(iso: string | null | undefined, ahora = Date.now()): string {
  const d = diasDesde(iso, ahora);
  if (d == null) return "—";
  if (d < 1) return "hoy";
  if (d < 14) return `hace ${d} d`;
  if (d < 60) return `hace ${Math.round(d / 7)} sem`;
  const meses = Math.round(d / 30);
  return `hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}
