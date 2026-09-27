import { Fragment, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { colorDeSerie, variacion } from "@/lib/datos";
import { TablaOculta } from "./comun";

export interface BarraDivergente {
  id: string;
  etiqueta: string;
  /** Lo que va debajo de la etiqueta, en gris: "38 productos". */
  detalle?: string;
  /** Una diferencia con signo, como fracción: 0,12 es +12 %. */
  valor: number;
  /**
   * El estado del valor, cuando el signo es bueno o malo (un precio propio más
   * caro que la competencia). Sin tono, la serie 1.
   */
  tono?: "pass" | "fail" | "neutral";
  /** Barras seguidas con el mismo grupo van bajo un mismo título ("Bembos"). */
  grupo?: string;
}

/**
 * Barras que salen de un cero central, para comparar una diferencia con signo
 * entre cosas con nombre: cuánto más caro o más barato está algo contra otro.
 * `Barras` no sirve para esto porque arranca de cero hacia un solo lado.
 *
 * El largo dice cuánto y el lado dice hacia dónde; las etiquetas de arriba
 * nombran los dos lados. El color no repite el valor: cuando el signo es un
 * estado (estar más caro que la competencia), va el tono de estado (pass/fail),
 * como el sentimiento; si no, la serie 1.
 *
 * El eje es simétrico y se recorta en `tope` (60 % por defecto): una diferencia
 * enorme no aplasta a las demás, y su valor real va igual en la punta.
 */
export function BarrasDivergentes({
  barras,
  titulo,
  formato = (n) => variacion(n),
  lados = ["Más barato", "Más caro"],
  tope,
  onElegir,
  oscuro = false,
  className,
  vacio = "Sin datos para mostrar.",
}: {
  barras: BarraDivergente[];
  /** Qué mide, para la tabla del lector de pantalla. */
  titulo: string;
  formato?: (n: number) => string;
  /** Cómo se llama cada lado del cero. */
  lados?: [izquierda: string, derecha: string];
  tope?: number;
  onElegir?: (id: string) => void;
  oscuro?: boolean;
  className?: string;
  vacio?: ReactNode;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  const mayor = Math.max(0.05, ...barras.map((b) => Math.abs(b.valor)));
  const limite = tope ?? Math.min(0.6, mayor);

  if (barras.length === 0)
    return (
      <p className={cn("py-6 text-center text-meta", oscuro ? "text-stage-3" : "text-ink-3")}>
        {vacio}
      </p>
    );

  const colorDe = (b: BarraDivergente) => {
    if (b.tono === "pass") return oscuro ? "var(--color-pass-soft)" : "var(--color-pass)";
    if (b.tono === "fail") return oscuro ? "var(--color-fail-soft)" : "var(--color-fail)";
    if (b.tono === "neutral") return oscuro ? "var(--color-stage-3)" : "var(--color-ink-4)";
    return colorDeSerie(0, oscuro);
  };
  const gris = oscuro ? "text-stage-3" : "text-ink-3";
  const columnas = "grid-cols-[minmax(0,clamp(7rem,36%,15rem))_minmax(0,1fr)_3.75rem]";

  return (
    <div className={className}>
      <div aria-hidden className={cn("mb-2 grid items-end gap-x-3 text-micro", columnas, gris)}>
        <span />
        {/* Los lados ocupan la barra y el valor: en un teléfono la columna de
            la barra sola es angosta y los nombres se partían en tres renglones. */}
        <span className="col-span-2 flex justify-between gap-3">
          <span className="max-w-[48%]">← {lados[0]}</span>
          <span className="max-w-[48%] text-right">{lados[1]} →</span>
        </span>
      </div>
      {/* Con onElegir cada barra es un botón con su nombre y su valor: no se
          puede esconder del lector de pantalla algo que recibe el foco. */}
      <ul className="space-y-1.5" aria-hidden={!onElegir || undefined}>
        {barras.map((b, i) => {
          const ancho = Math.min(1, Math.abs(b.valor) / limite) * 50;
          const apagada = encima !== null && encima !== b.id;
          const titular = b.grupo && b.grupo !== barras[i - 1]?.grupo ? b.grupo : null;
          const Fila = onElegir ? "button" : "div";
          return (
            <Fragment key={b.id}>
              {titular && (
                <li
                  className={cn(
                    "pb-0.5 text-meta font-medium",
                    i > 0 && "pt-3",
                    oscuro ? "text-stage-ink" : "text-ink",
                  )}
                >
                  {titular}
                </li>
              )}
              <li>
                <Fila
                  {...(onElegir
                    ? {
                        type: "button" as const,
                        onClick: () => onElegir(b.id),
                        "aria-label": `${b.grupo ? `${b.grupo}, ` : ""}${b.etiqueta}: ${formato(b.valor)}`,
                      }
                    : {})}
                  onPointerEnter={() => setEncima(b.id)}
                  onPointerLeave={() => setEncima(null)}
                  className={cn(
                    "grid w-full items-center gap-x-3 py-0.5 text-left",
                    columnas,
                    onElegir && "rounded-control transition-colors",
                    onElegir && (oscuro ? "hover:bg-white/[.04]" : "hover:bg-paper-sunken/50"),
                  )}
                >
                  <span className="min-w-0 leading-tight">
                    <span
                      className={cn(
                        "block truncate text-base",
                        oscuro ? "text-stage-ink" : "text-ink-2",
                      )}
                    >
                      {b.etiqueta}
                    </span>
                    {b.detalle && (
                      <span className={cn("block truncate text-micro", gris)}>{b.detalle}</span>
                    )}
                  </span>
                  <span className="relative h-2.5 min-w-0">
                    <span
                      className={cn(
                        "absolute inset-y-[-4px] left-1/2 w-px",
                        oscuro ? "bg-stage-3/60" : "bg-rule-strong",
                      )}
                    />
                    <span
                      className={cn(
                        "absolute inset-y-0 transition-[width,opacity] duration-500 ease-out",
                        b.valor >= 0 ? "left-1/2 rounded-r-[4px]" : "right-1/2 rounded-l-[4px]",
                      )}
                      style={{
                        width: `${ancho}%`,
                        background: colorDe(b),
                        opacity: apagada ? 0.45 : 1,
                      }}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-right text-meta font-medium tnum",
                      oscuro ? "text-stage-ink" : "text-ink",
                    )}
                  >
                    {formato(b.valor)}
                  </span>
                </Fila>
              </li>
            </Fragment>
          );
        })}
      </ul>
      {!onElegir && (
        <TablaOculta
          titulo={titulo}
          columnas={["", titulo]}
          filas={barras.map((b) => [
            b.grupo ? `${b.grupo} · ${b.etiqueta}` : b.etiqueta,
            formato(b.valor),
          ])}
        />
      )}
    </div>
  );
}
