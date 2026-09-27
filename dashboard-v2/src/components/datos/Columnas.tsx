import { useMemo, useState } from "react";
import { escala, marcasDelEje, numero } from "@/lib/datos";
import { TablaOculta, TooltipDeDatos, useAncho } from "./comun";
import { Leyenda } from "./Leyenda";

export interface SerieDeColumna {
  id: string;
  etiqueta: string;
  color: string;
  valores: number[];
}

const M = { arriba: 14, derecha: 8, abajo: 26 };
const GROSOR_MAX = 24;
const HUECO = 2;

/**
 * Columnas por categoría o por período. Apiladas cuando las series suman un
 * total que importa (comentarios por sentimiento cada día); lado a lado cuando
 * se comparan entre sí. Nunca más gruesas que 24 px: el aire entre columnas es
 * parte del gráfico. Punta redondeada de 4 px, base recta sobre el eje.
 *
 * Cada columna es su propio blanco: al pasar, el tooltip muestra todas las
 * series de esa categoría.
 */
export function Columnas({
  categorias,
  series,
  titulo,
  apiladas = false,
  formato = (n) => numero(n),
  alto = 220,
  oscuro = false,
  leyenda,
  etiquetas = false,
  className,
}: {
  categorias: string[];
  series: SerieDeColumna[];
  titulo: string;
  apiladas?: boolean;
  formato?: (n: number) => string;
  alto?: number;
  oscuro?: boolean;
  leyenda?: boolean;
  /** El valor sobre cada columna. Solo con una serie y pocas columnas. */
  etiquetas?: boolean;
  className?: string;
}) {
  const [ref, ancho] = useAncho<HTMLDivElement>();
  const [encima, setEncima] = useState<number | null>(null);
  const n = categorias.length;
  const conLeyenda = leyenda ?? series.length >= 2;

  const { ticks, y, izquierda } = useMemo(() => {
    const totales = categorias.map((_, i) =>
      apiladas
        ? series.reduce((s, se) => s + Math.max(0, se.valores[i] ?? 0), 0)
        : Math.max(0, ...series.map((se) => se.valores[i] ?? 0)),
    );
    const ticks = marcasDelEje(Math.max(0, ...totales));
    const izquierda = Math.max(28, ...ticks.map((t) => formato(t).length * 6.6 + 10));
    const y = escala([0, ticks[ticks.length - 1] ?? 1], [alto - M.abajo, M.arriba]);
    return { ticks, y, izquierda };
  }, [categorias, series, apiladas, alto, formato]);

  const banda = n > 0 ? (ancho - izquierda - M.derecha) / n : 0;
  const grupo = apiladas ? 1 : series.length;
  const grosor = Math.max(2, Math.min(GROSOR_MAX, (banda * 0.62 - HUECO * (grupo - 1)) / grupo));
  const cadaCuanto = Math.max(1, Math.ceil(n / Math.max(1, Math.floor((ancho - izquierda) / 56))));
  const gris = oscuro ? "var(--color-stage-rule)" : "var(--color-rule)";
  const textoEje = oscuro ? "var(--color-stage-3)" : "var(--color-ink-3)";
  const tinta = oscuro ? "var(--color-stage-ink)" : "var(--color-ink)";
  const base = y(0);

  // Una columna con punta redondeada arriba y base recta.
  const columna = (cx: number, desde: number, hasta: number, redonda: boolean) => {
    const h = Math.max(0, desde - hasta);
    const r = redonda ? Math.min(4, h, grosor / 2) : 0;
    const x0 = cx;
    const x1 = cx + grosor;
    return `M${x0},${desde} L${x0},${hasta + r} Q${x0},${hasta} ${x0 + r},${hasta} L${x1 - r},${hasta} Q${x1},${hasta} ${x1},${hasta + r} L${x1},${desde} Z`;
  };

  return (
    <div className={className}>
      <div ref={ref} className="relative w-full" style={{ height: alto }}>
        {ancho > 0 && (
          <svg
            width={ancho}
            height={alto}
            role="img"
            aria-label={titulo}
            className="block"
            onPointerLeave={() => setEncima(null)}
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
                >
                  {formato(t)}
                </text>
              </g>
            ))}
            {categorias.map((cat, i) => {
              const centro = izquierda + banda * i + banda / 2;
              const anchoGrupo = grupo * grosor + (grupo - 1) * HUECO;
              let acumulado = base;
              const apagada = encima !== null && encima !== i;
              const ultimaConValor = apiladas
                ? series.reduce((u, s, k) => ((s.valores[i] ?? 0) > 0 ? k : u), -1)
                : -1;
              return (
                <g
                  key={cat + i}
                  opacity={apagada ? 0.5 : 1}
                  className="transition-opacity duration-150"
                >
                  {/* El blanco es la banda entera, no los píxeles pintados. */}
                  <rect
                    x={izquierda + banda * i}
                    y={M.arriba}
                    width={banda}
                    height={alto - M.arriba - M.abajo}
                    fill="transparent"
                    onPointerEnter={() => setEncima(i)}
                  />
                  {series.map((s, k) => {
                    const v = Math.max(0, s.valores[i] ?? 0);
                    if (v === 0) return null;
                    if (apiladas) {
                      // El hueco de 2 px sale del segmento de arriba: el total
                      // sigue cayendo donde dice el eje.
                      const hasta = acumulado - (base - y(v));
                      const desde = acumulado === base ? base : acumulado - HUECO;
                      acumulado = hasta;
                      return (
                        <path
                          key={s.id}
                          pointerEvents="none"
                          d={columna(
                            centro - grosor / 2,
                            desde,
                            Math.min(desde, hasta),
                            k === ultimaConValor,
                          )}
                          style={{ fill: s.color }}
                        />
                      );
                    }
                    const x0 = centro - anchoGrupo / 2 + k * (grosor + HUECO);
                    return (
                      <path
                        key={s.id}
                        pointerEvents="none"
                        d={columna(x0, base, y(v), true)}
                        style={{ fill: s.color }}
                      />
                    );
                  })}
                  {etiquetas && series.length === 1 && (series[0]!.valores[i] ?? 0) > 0 && (
                    <text
                      x={centro}
                      y={y(series[0]!.valores[i]!) - 5}
                      textAnchor="middle"
                      fontSize={11}
                      fill={tinta}
                      className="tnum"
                    >
                      {formato(series[0]!.valores[i]!)}
                    </text>
                  )}
                  {i % cadaCuanto === 0 && (
                    <text x={centro} y={alto - 6} textAnchor="middle" fontSize={11} fill={textoEje}>
                      {cat}
                    </text>
                  )}
                </g>
              );
            })}
            <line
              x1={izquierda}
              x2={ancho - M.derecha}
              y1={base}
              y2={base}
              stroke={oscuro ? "var(--color-stage-3)" : "var(--color-rule-strong)"}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </svg>
        )}
        {encima != null && ancho > 0 && (
          <TooltipDeDatos
            x={izquierda + banda * encima + banda / 2}
            y={M.arriba}
            ancho={ancho}
            titulo={
              apiladas && series.length > 1
                ? `${categorias[encima]} · ${formato(series.reduce((s, se) => s + (se.valores[encima] ?? 0), 0))}`
                : categorias[encima]
            }
            filas={series.map((s) => ({
              color: s.color,
              etiqueta: s.etiqueta,
              valor: formato(s.valores[encima] ?? 0),
              forma: "rect" as const,
            }))}
          />
        )}
      </div>
      {conLeyenda && (
        <Leyenda
          className="mt-3"
          oscuro={oscuro}
          items={series.map((s) => ({ id: s.id, etiqueta: s.etiqueta, color: s.color }))}
        />
      )}
      <TablaOculta
        titulo={titulo}
        columnas={["", ...series.map((s) => s.etiqueta)]}
        filas={categorias.map((c, i) => [c, ...series.map((s) => formato(s.valores[i] ?? 0))])}
      />
    </div>
  );
}
