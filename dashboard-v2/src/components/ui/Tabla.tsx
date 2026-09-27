import { Fragment, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type Orden = { columna: string; sentido: "asc" | "desc" } | null;

export interface Columna<T> {
  id: string;
  titulo: ReactNode;
  /** Lo que se ve en la celda. */
  celda: (fila: T) => ReactNode;
  /** Números a la derecha y en tnum: las cifras se alinean solas. */
  numerica?: boolean;
  ordenable?: boolean;
  ancho?: string;
  /** Se esconde por debajo de md: lo que en un teléfono no entra. */
  secundaria?: boolean;
  className?: string;
}

/**
 * Una tabla de datos. Para listas de cosas que se abren están las filas de la
 * lista (ver patrones); esto es para comparar valores entre filas: precios,
 * métricas, cuentas.
 *
 * Sin rejilla: una regla fina bajo el encabezado y el fondo de la fila al
 * pasar. El encabezado queda fijo mientras la tabla se recorre.
 *
 * `grupo` parte las filas bajo un título (la categoría de un producto, por
 * ejemplo) sin repetir el encabezado de las columnas: las filas tienen que
 * llegar ya agrupadas, y el orden de las columnas vale adentro de cada grupo.
 * Lo usan la comparativa y el catálogo de una tienda, que se leen por categoría.
 */
export function Tabla<T>({
  columnas,
  filas,
  clave,
  orden,
  onOrden,
  onFila,
  filaActiva,
  vacio,
  className,
  densa = false,
  etiqueta,
  grupo,
}: {
  columnas: Columna<T>[];
  filas: T[];
  clave: (fila: T) => string;
  orden?: Orden;
  onOrden?: (orden: Orden) => void;
  onFila?: (fila: T) => void;
  filaActiva?: string | null;
  vacio?: ReactNode;
  className?: string;
  densa?: boolean;
  /** Qué es la tabla, para el lector de pantalla. */
  etiqueta: string;
  /** El grupo de cada fila; un título nuevo cada vez que cambia. */
  grupo?: (fila: T) => string;
}) {
  const cuentas = new Map<string, number>();
  if (grupo) for (const f of filas) cuentas.set(grupo(f), (cuentas.get(grupo(f)) ?? 0) + 1);

  const alOrdenar = (c: Columna<T>) => {
    if (!onOrden || !c.ordenable) return;
    if (orden?.columna !== c.id) onOrden({ columna: c.id, sentido: c.numerica ? "desc" : "asc" });
    else if (orden.sentido === (c.numerica ? "desc" : "asc"))
      onOrden({ columna: c.id, sentido: c.numerica ? "asc" : "desc" });
    else onOrden(null);
  };

  return (
    <div className={cn("scrollbar-thin relative overflow-x-auto", className)}>
      <table className="w-full border-separate border-spacing-0 text-left" aria-label={etiqueta}>
        <thead>
          <tr>
            {columnas.map((c) => {
              const activa = orden?.columna === c.id;
              const Flecha = !activa
                ? ChevronsUpDown
                : orden.sentido === "asc"
                  ? ArrowUp
                  : ArrowDown;
              return (
                <th
                  key={c.id}
                  scope="col"
                  style={c.ancho ? { width: c.ancho } : undefined}
                  aria-sort={
                    activa ? (orden.sentido === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(
                    "sticky top-0 z-[1] border-b border-rule bg-paper-raised px-3 py-2.5 align-bottom text-meta font-medium text-ink-3",
                    "first:pl-5 last:pr-5",
                    c.numerica && "text-right",
                    c.secundaria && "hidden md:table-cell",
                    c.className,
                  )}
                >
                  {c.ordenable && onOrden ? (
                    <button
                      type="button"
                      onClick={() => alOrdenar(c)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-chip transition-colors hover:text-ink",
                        c.numerica && "flex-row-reverse",
                        activa && "text-ink",
                      )}
                    >
                      {c.titulo}
                      <Flecha
                        className={cn("h-3.5 w-3.5 shrink-0", activa ? "text-ember" : "text-ink-4")}
                        strokeWidth={2}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && vacio ? (
            <tr>
              <td colSpan={columnas.length}>{vacio}</td>
            </tr>
          ) : (
            filas.map((f, i) => {
              const k = clave(f);
              const activa = filaActiva === k;
              const g = grupo?.(f);
              const titular = grupo && (i === 0 || grupo(filas[i - 1]!) !== g) ? g : null;
              return (
                <Fragment key={k}>
                  {titular != null && (
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={columnas.length}
                        className="border-b border-rule bg-paper-sunken/45 px-3 py-2 text-left text-meta font-medium text-ink-2 first:pl-5"
                      >
                        {titular}
                        <span className="ml-2 font-normal text-ink-4 tnum">
                          {cuentas.get(titular)}
                        </span>
                      </th>
                    </tr>
                  )}
                  <tr
                    onClick={onFila ? () => onFila(f) : undefined}
                    aria-selected={onFila ? activa : undefined}
                    className={cn(
                      "group transition-colors duration-150",
                      onFila && "cursor-pointer",
                      activa ? "bg-paper-sunken" : "hover:bg-paper-sunken/60",
                    )}
                  >
                    {columnas.map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          "border-b border-rule/70 px-3 align-middle text-base text-ink-2 first:pl-5 last:pr-5",
                          densa ? "py-2" : "py-3",
                          c.numerica && "text-right tnum text-ink",
                          c.secundaria && "hidden md:table-cell",
                          c.className,
                        )}
                      >
                        {c.celda(f)}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Ordena en el front una lista que ya está entera (no una página del back). */
export function ordenar<T>(
  filas: T[],
  orden: Orden,
  valor: (fila: T, columna: string) => string | number | null | undefined,
): T[] {
  if (!orden) return filas;
  const signo = orden.sentido === "asc" ? 1 : -1;
  return [...filas].sort((a, b) => {
    const va = valor(a, orden.columna);
    const vb = valor(b, orden.columna);
    // Lo que no tiene valor va al final, en los dos sentidos.
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * signo;
    return String(va).localeCompare(String(vb), "es", { numeric: true }) * signo;
  });
}
