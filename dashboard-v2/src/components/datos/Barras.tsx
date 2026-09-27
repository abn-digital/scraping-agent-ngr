import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { colorDeSerie, numero } from "@/lib/datos";
import { TablaOculta } from "./comun";

export interface Barra {
  id: string;
  etiqueta: string;
  valor: number;
  /** Algo antes de la etiqueta: un logo, un ícono de plataforma. */
  marca?: ReactNode;
  /** Lo que va debajo de la etiqueta, en gris: "12 posts", "Perú". */
  detalle?: string;
  /** El color de la barra. Sin color, la serie 1: una sola serie lleva un solo color. */
  color?: string;
}

/**
 * Barras horizontales para comparar magnitudes entre cosas con nombre: marcas,
 * cuentas, productos. Una sola serie: todas las barras del mismo color (el valor
 * ya está en el largo; pintarlas según el valor gasta el color en decir lo
 * mismo dos veces).
 *
 * `destacado` marca una sola barra en ember: la elegida o la propia. El resto,
 * en su color. El valor va en la punta, en tinta.
 */
export function Barras({
  barras,
  titulo,
  formato = (n) => numero(n),
  destacado,
  onElegir,
  max,
  oscuro = false,
  className,
  vacio = "Sin datos para mostrar.",
}: {
  barras: Barra[];
  /** Qué mide, para la tabla del lector de pantalla. */
  titulo: string;
  formato?: (n: number) => string;
  destacado?: string | null;
  onElegir?: (id: string) => void;
  /** El valor que llena la barra. Sin esto, el mayor de la lista. */
  max?: number;
  oscuro?: boolean;
  className?: string;
  vacio?: ReactNode;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  const tope = max ?? Math.max(0, ...barras.map((b) => b.valor));

  if (barras.length === 0)
    return (
      <p className={cn("py-6 text-center text-meta", oscuro ? "text-stage-3" : "text-ink-3")}>
        {vacio}
      </p>
    );

  return (
    <div className={className}>
      <ul className="space-y-2.5" aria-hidden={onElegir ? undefined : true}>
        {barras.map((b) => {
          const ancho = tope > 0 ? Math.max(0, b.valor / tope) : 0;
          const esDestacada = destacado === b.id;
          const apagada = encima !== null && encima !== b.id;
          const color = esDestacada ? "var(--color-ember)" : (b.color ?? colorDeSerie(0, oscuro));
          const Fila = onElegir ? "button" : "div";
          return (
            <li key={b.id}>
              <Fila
                {...(onElegir
                  ? {
                      type: "button" as const,
                      onClick: () => onElegir(b.id),
                      "aria-label": `${b.etiqueta}: ${formato(b.valor)}`,
                      "aria-pressed": esDestacada,
                    }
                  : {})}
                onPointerEnter={() => setEncima(b.id)}
                onPointerLeave={() => setEncima(null)}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,clamp(6rem,34%,13rem))_minmax(0,1fr)_auto] items-center gap-x-3 text-left",
                  onElegir && "rounded-control transition-colors",
                  onElegir && (oscuro ? "hover:bg-white/[.04]" : "hover:bg-paper-sunken/50"),
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {b.marca}
                  <span className="min-w-0 leading-tight">
                    <span
                      className={cn(
                        "block truncate text-base",
                        oscuro ? "text-stage-ink" : "text-ink-2",
                        esDestacada && "font-medium",
                      )}
                    >
                      {b.etiqueta}
                    </span>
                    {b.detalle && (
                      <span
                        className={cn(
                          "block truncate text-micro",
                          oscuro ? "text-stage-3" : "text-ink-3",
                        )}
                      >
                        {b.detalle}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-2.5 min-w-0 rounded-full",
                    oscuro ? "bg-white/[.05]" : "bg-paper-sunken/70",
                  )}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width,opacity] duration-500 ease-out"
                    style={{
                      width: `${ancho * 100}%`,
                      background: color,
                      opacity: apagada ? 0.45 : 1,
                    }}
                  />
                </span>
                <span
                  className={cn(
                    "min-w-[3.5rem] text-right text-meta font-medium tnum",
                    oscuro ? "text-stage-ink" : "text-ink",
                  )}
                >
                  {formato(b.valor)}
                </span>
              </Fila>
            </li>
          );
        })}
      </ul>
      <TablaOculta
        titulo={titulo}
        columnas={["", titulo]}
        filas={barras.map((b) => [b.etiqueta, formato(b.valor)])}
      />
    </div>
  );
}
