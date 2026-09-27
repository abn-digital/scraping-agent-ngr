import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** El ancho real del contenedor: los gráficos se dibujan a su medida, no escalados. */
export function useAncho<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.clientWidth);
    const obs = new ResizeObserver(([e]) => setAncho(Math.round(e!.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, ancho] as const;
}

export interface FilaDeTooltip {
  color: string;
  etiqueta: string;
  valor: string;
  /** Rect para barras y áreas, línea para líneas: la clave imita a la marca. */
  forma?: "linea" | "rect";
  /** Una segunda línea chica debajo del nombre: el desglose del valor. */
  detalle?: string;
}

/**
 * El tooltip de un gráfico: un pedazo del escenario, como el tooltip del
 * sistema. El valor va primero y fuerte; la serie, después y en gris: acá la
 * persona ya sabe de qué serie se trata y quiere el número.
 */
export function TooltipDeDatos({
  x,
  y,
  ancho,
  titulo,
  filas,
  pie,
}: {
  x: number;
  y: number;
  /** El ancho del gráfico, para voltear el tooltip antes de que se salga. */
  ancho: number;
  titulo: ReactNode;
  filas: FilaDeTooltip[];
  /** Lo que se puede hacer desde ahí ("Clic para ver los comentarios"). */
  pie?: ReactNode;
}) {
  const aLaIzquierda = x > ancho - 200;
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 min-w-[140px] max-w-[240px] rounded-control border border-white/10 bg-stage-raised
        px-2.5 py-2 text-meta leading-snug text-stage-ink shadow-sheet"
      style={{
        left: aLaIzquierda ? undefined : x + 14,
        right: aLaIzquierda ? ancho - x + 14 : undefined,
        top: Math.max(0, y - 12),
      }}
    >
      <p className="mb-1 text-micro text-stage-3">{titulo}</p>
      <ul className="space-y-0.5">
        {filas.map((f) => (
          <li key={f.etiqueta}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "shrink-0",
                  f.forma === "rect" ? "h-2 w-2 rounded-[2px]" : "h-[2px] w-3 rounded-full",
                )}
                style={{ background: f.color }}
              />
              <span className="font-medium tnum text-stage-ink">{f.valor}</span>
              <span className="min-w-0 truncate text-stage-3">{f.etiqueta}</span>
            </span>
            {f.detalle && (
              <span className="block pl-5 text-micro tnum text-stage-3">{f.detalle}</span>
            )}
          </li>
        ))}
      </ul>
      {pie && (
        <p className="mt-1.5 border-t border-white/10 pt-1.5 text-micro text-stage-3">{pie}</p>
      )}
    </div>
  );
}

/**
 * Los mismos datos como tabla, para el lector de pantalla. El tooltip enriquece
 * pero no encierra: todo valor tiene que poder leerse sin pasar el mouse.
 */
export function TablaOculta({
  titulo,
  columnas,
  filas,
}: {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
}) {
  // La tabla va adentro de un div sr-only y no es ella misma sr-only: una
  // <table> no respeta el ancho de 1 px y crece hasta su contenido, y en un
  // teléfono empujaba la página hacia el costado (scroll horizontal).
  return (
    <div className="sr-only">
      <table>
        <caption>{titulo}</caption>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              {f.map((v, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {v}
                  </th>
                ) : (
                  <td key={j}>{v}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
