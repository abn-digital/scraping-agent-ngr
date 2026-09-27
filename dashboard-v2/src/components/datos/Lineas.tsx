import { useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { escala, marcasDelEje, numero } from "@/lib/datos";
import { TablaOculta, TooltipDeDatos, useAncho } from "./comun";
import { Leyenda } from "./Leyenda";

export interface SerieDeLinea {
  id: string;
  etiqueta: string;
  color: string;
  /** Un valor por posición del eje X; null es un hueco (sin dato ese día). */
  valores: (number | null)[];
}

const M = { arriba: 12, derecha: 14, abajo: 26 };

/**
 * Cómo cambia algo en el tiempo. Líneas de 2 px, una grilla de reglas finas y
 * un solo eje: dos medidas de escala distinta van en dos gráficos, nunca en uno
 * con dos ejes (el cruce de las escalas es arbitrario e inventa correlaciones).
 *
 * Pasar el mouse (o las flechas, con el gráfico enfocado) marca una fecha con
 * una línea vertical y el tooltip muestra todas las series en esa fecha: no hay
 * que apuntarle a una línea de 2 px.
 */
export function Lineas({
  etiquetasX,
  series,
  titulo,
  formato = (n) => numero(n),
  alto = 240,
  area,
  minY,
  maxY,
  oscuro = false,
  leyenda,
  alternables = false,
  className,
}: {
  /** Lo que dice el eje X en cada posición, ya formateado ("3 sept"). */
  etiquetasX: string[];
  series: SerieDeLinea[];
  titulo: string;
  formato?: (n: number) => string;
  alto?: number;
  /** El lavado del 10 % debajo de la línea. Por defecto, solo con una serie. */
  area?: boolean;
  minY?: number;
  maxY?: number;
  oscuro?: boolean;
  /** Por defecto, con dos series o más. */
  leyenda?: boolean;
  /** Que la leyenda prenda y apague series. */
  alternables?: boolean;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [indice, setIndice] = useState<number | null>(null);
  const [apagadas, setApagadas] = useState<Set<string>>(new Set());
  const visibles = series.filter((s) => !apagadas.has(s.id));
  const n = etiquetasX.length;
  const conArea = area ?? series.length === 1;
  const conLeyenda = leyenda ?? series.length >= 2;

  const { ticks, y, x, izquierda } = useMemo(() => {
    const todos = visibles.flatMap((s) => s.valores.filter((v): v is number => v != null));
    const tope = maxY ?? Math.max(0, ...todos);
    const piso = minY ?? Math.min(0, ...todos);
    const ticks = marcasDelEje(tope - piso).map((t) => t + piso);
    const mayor = ticks[ticks.length - 1] ?? 1;
    const izquierda = Math.max(28, ...ticks.map((t) => formato(t).length * 6.6 + 10));
    const y = escala([piso, mayor], [alto - M.abajo, M.arriba]);
    const x = escala(
      [0, Math.max(1, n - 1)],
      [izquierda, Math.max(izquierda + 1, ancho - M.derecha)],
    );
    return { ticks, y, x, izquierda };
  }, [visibles, maxY, minY, alto, n, ancho, formato]);

  // Las etiquetas del eje X no se pisan: cada una necesita unos 64 px.
  const cadaCuanto = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((ancho - izquierda) / 64))));

  // La última fecha se muestra si no queda pegada a la anterior que se ve.
  const ultimaMarcada = Math.floor((n - 1) / cadaCuanto) * cadaCuanto;
  const visibleEnEje = (i: number) =>
    i % cadaCuanto === 0 || (i === n - 1 && n - 1 - ultimaMarcada >= cadaCuanto * 0.6);

  const camino = (valores: (number | null)[]) => {
    let d = "";
    let abierto = false;
    valores.forEach((v, i) => {
      if (v == null) {
        abierto = false;
        return;
      }
      d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      abierto = true;
    });
    return d;
  };

  const lavado = (valores: (number | null)[]) => {
    const puntos = valores
      .map((v, i) => (v == null ? null : ([x(i), y(v)] as const)))
      .filter(Boolean) as (readonly [number, number])[];
    if (puntos.length < 2) return "";
    const base = y(ticks[0] ?? 0);
    return `M${puntos[0]![0]},${base} ${puntos.map(([a, b]) => `L${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} L${puntos[puntos.length - 1]![0]},${base} Z`;
  };

  const alMover = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - izquierda) / Math.max(1, ancho - M.derecha - izquierda)) * (n - 1));
    setIndice(Math.max(0, Math.min(n - 1, i)));
  };

  const alTecla = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      setIndice((i) => {
        const base = i ?? (e.key === "ArrowRight" ? -1 : n);
        return Math.max(0, Math.min(n - 1, base + (e.key === "ArrowRight" ? 1 : -1)));
      });
    } else if (e.key === "Escape") setIndice(null);
  };

  const gris = oscuro ? "var(--color-stage-rule)" : "var(--color-rule)";
  const textoEje = oscuro ? "var(--color-stage-3)" : "var(--color-ink-3)";
  const fondo = oscuro ? "var(--color-stage)" : "var(--color-paper-raised)";

  return (
    <div className={className}>
      <div ref={ref} className="relative w-full" style={{ height: alto }}>
        {ancho > 0 && (
          <svg
            width={ancho}
            height={alto}
            role="img"
            aria-label={`${titulo}. Usá las flechas para recorrer las fechas.`}
            tabIndex={0}
            onPointerMove={alMover}
            onPointerLeave={() => setIndice(null)}
            onKeyDown={alTecla}
            onBlur={() => setIndice(null)}
            className="block touch-pan-y rounded-control focus-visible:outline-offset-4"
          >
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={izquierda}
                  x2={ancho - M.derecha}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={gris}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={izquierda - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fill={textoEje}
                  className="tnum"
                >
                  {formato(t)}
                </text>
              </g>
            ))}
            {etiquetasX.map((et, i) =>
              visibleEnEje(i) ? (
                <text
                  key={i}
                  x={x(i)}
                  y={alto - 6}
                  textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
                  fontSize={11}
                  fill={textoEje}
                >
                  {et}
                </text>
              ) : null,
            )}

            {conArea &&
              visibles.map((s) => (
                <path
                  key={`a-${s.id}`}
                  d={lavado(s.valores)}
                  style={{ fill: s.color }}
                  opacity={0.1}
                />
              ))}
            {visibles.map((s) => (
              <path
                key={s.id}
                d={camino(s.valores)}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ stroke: s.color }}
                className="transition-opacity duration-150"
              />
            ))}
            {/* Un punto aislado (con huecos a los dos lados) no dibuja línea: sin esto desaparece. */}
            {visibles.map((s) =>
              s.valores.map((v, i) =>
                v != null && s.valores[i - 1] == null && s.valores[i + 1] == null ? (
                  <circle
                    key={`${s.id}-${i}`}
                    cx={x(i)}
                    cy={y(v)}
                    r={2.5}
                    style={{ fill: s.color }}
                  />
                ) : null,
              ),
            )}

            {indice != null && (
              <g>
                <line
                  x1={x(indice)}
                  x2={x(indice)}
                  y1={M.arriba}
                  y2={alto - M.abajo}
                  stroke={oscuro ? "var(--color-stage-3)" : "var(--color-ink-4)"}
                  strokeWidth={1}
                />
                {visibles.map((s) => {
                  const v = s.valores[indice];
                  return v == null ? null : (
                    <circle
                      key={s.id}
                      cx={x(indice)}
                      cy={y(v)}
                      r={4}
                      strokeWidth={2}
                      style={{ fill: s.color, stroke: fondo }}
                    />
                  );
                })}
              </g>
            )}
          </svg>
        )}
        {indice != null && ancho > 0 && (
          <TooltipDeDatos
            x={x(indice)}
            y={M.arriba}
            ancho={ancho}
            titulo={etiquetasX[indice]}
            filas={visibles
              .map((s) => ({ s, v: s.valores[indice] }))
              .sort((a, b) => (b.v ?? -Infinity) - (a.v ?? -Infinity))
              .map(({ s, v }) => ({
                color: s.color,
                etiqueta: s.etiqueta,
                valor: v == null ? "—" : formato(v),
                forma: "linea" as const,
              }))}
          />
        )}
      </div>
      {conLeyenda && (
        <Leyenda
          className="mt-3"
          forma="linea"
          oscuro={oscuro}
          items={series.map((s) => ({ id: s.id, etiqueta: s.etiqueta, color: s.color }))}
          apagadas={alternables ? apagadas : undefined}
          onAlternar={
            alternables
              ? (id) =>
                  setApagadas((prev) => {
                    const sig = new Set(prev);
                    if (sig.has(id)) sig.delete(id);
                    // Apagar todas deja un gráfico vacío que no dice nada.
                    else if (sig.size < series.length - 1) sig.add(id);
                    return sig;
                  })
              : undefined
          }
        />
      )}
      <TablaOculta
        titulo={titulo}
        columnas={["", ...series.map((s) => s.etiqueta)]}
        filas={etiquetasX.map((et, i) => [
          et,
          ...series.map((s) => (s.valores[i] == null ? "—" : formato(s.valores[i]!))),
        ])}
      />
      <span className={cn("sr-only")} aria-live="polite">
        {indice != null
          ? `${etiquetasX[indice]}: ${visibles.map((s) => `${s.etiqueta} ${s.valores[indice] == null ? "sin dato" : formato(s.valores[indice]!)}`).join(", ")}`
          : ""}
      </span>
    </div>
  );
}
