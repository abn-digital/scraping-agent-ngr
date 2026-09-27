import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { escala, variacion } from "@/lib/datos";

/**
 * Un número que es la respuesta. Cuando lo que importa es una cifra, la cifra
 * es el gráfico: una barra sola o una torta de dos porciones dicen menos.
 *
 * El valor va en la display, como todo número grande de resumen, con cifras
 * proporcionales (tnum solo en columnas). La variación dice el signo, contra
 * qué período, y su color depende de si subir es bueno: `mejorSiBaja` para lo
 * que conviene que baje (el sentimiento negativo, un precio propio).
 */
export function Cifra({
  etiqueta,
  valor,
  detalle,
  delta,
  contra,
  mejorSiBaja = false,
  tendencia,
  tamano = "md",
  oscuro = false,
  className,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  /** Variación como fracción: 0,12 es +12 %. */
  delta?: number | null;
  /** Contra qué se compara: "vs. los 30 días anteriores". */
  contra?: string;
  mejorSiBaja?: boolean;
  /** Hasta doce puntos, del más viejo al más nuevo. */
  tendencia?: number[];
  tamano?: "sm" | "md" | "lg";
  oscuro?: boolean;
  className?: string;
}) {
  const hayDelta = delta != null && !Number.isNaN(delta);
  const bueno = hayDelta && delta !== 0 ? delta > 0 !== mejorSiBaja : null;
  const Flecha = !hayDelta || delta === 0 ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("label", oscuro && "text-stage-3")}>{etiqueta}</p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p
          className={cn(
            "min-w-0 truncate font-display font-semibold",
            tamano === "lg" && "text-h1 tracking-[-.03em]",
            tamano === "md" && "text-h2 tracking-[-.025em]",
            tamano === "sm" && "text-h3",
            oscuro ? "text-stage-ink" : "text-ink",
          )}
        >
          {valor}
        </p>
        {tendencia && tendencia.length > 1 && <Chispa valores={tendencia} oscuro={oscuro} />}
      </div>
      {(hayDelta || detalle) && (
        <p
          className={cn(
            "mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta",
            oscuro ? "text-stage-3" : "text-ink-3",
          )}
        >
          {hayDelta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tnum",
                bueno === null && (oscuro ? "text-stage-3" : "text-ink-3"),
                bueno === true && (oscuro ? "text-pass-soft" : "text-pass"),
                bueno === false && (oscuro ? "text-fail-soft" : "text-fail"),
              )}
            >
              <Flecha className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              {variacion(delta)}
              <span className="sr-only">
                {bueno === true ? " (mejora)" : bueno === false ? " (empeora)" : ""}
              </span>
            </span>
          )}
          {hayDelta && contra && <span>{contra}</span>}
          {detalle && <span>{detalle}</span>}
        </p>
      )}
    </div>
  );
}

/** La tendencia en una línea: el gris de lo que no es protagonista y el último punto en tinta. */
export function Chispa({
  valores,
  oscuro = false,
  ancho = 76,
  alto = 28,
}: {
  valores: number[];
  oscuro?: boolean;
  ancho?: number;
  alto?: number;
}) {
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const x = escala([0, valores.length - 1], [2, ancho - 4]);
  const y = escala([min, max === min ? min + 1 : max], [alto - 3, 3]);
  const d = valores
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const ultimo = valores[valores.length - 1]!;
  return (
    <svg width={ancho} height={alto} aria-hidden className="shrink-0 overflow-visible">
      <path
        d={d}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ stroke: oscuro ? "var(--color-stage-3)" : "var(--color-ink-4)" }}
      />
      <circle
        cx={x(valores.length - 1)}
        cy={y(ultimo)}
        r={2.5}
        style={{ fill: oscuro ? "var(--color-stage-ink)" : "var(--color-ink)" }}
      />
    </svg>
  );
}
