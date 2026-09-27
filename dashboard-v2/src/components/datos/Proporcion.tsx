import { useState } from "react";
import { cn } from "@/lib/cn";
import { numero, porcentaje } from "@/lib/datos";
import { TablaOculta } from "./comun";
import { Leyenda } from "./Leyenda";

export interface Parte {
  id: string;
  etiqueta: string;
  valor: number;
  color: string;
}

/**
 * Cómo se reparte un total: el sentimiento de los comentarios, el share de voz.
 * Una barra partida en segmentos, separados por 2 px de papel (no por un
 * borde), y la leyenda abajo con el porcentaje de cada uno. Hasta seis partes:
 * con más, las chicas se juntan en "Otras" antes de llegar acá.
 *
 * El porcentaje va adentro del segmento solo si entra con aire; si no, lo dicen
 * la leyenda y el tooltip. Nunca se recorta.
 */
export function Proporcion({
  partes,
  titulo,
  alto = 10,
  leyenda = true,
  oscuro = false,
  className,
}: {
  partes: Parte[];
  titulo: string;
  alto?: number;
  leyenda?: boolean;
  oscuro?: boolean;
  className?: string;
}) {
  const [encima, setEncima] = useState<string | null>(null);
  const total = partes.reduce((s, p) => s + Math.max(0, p.valor), 0);
  const visibles = partes.filter((p) => p.valor > 0);
  const actual = visibles.find((p) => p.id === encima);

  return (
    <div className={className}>
      <div className="relative">
        <div
          aria-hidden
          className={cn(
            "flex w-full gap-[2px] overflow-hidden rounded-full",
            total === 0 && (oscuro ? "bg-white/[.06]" : "bg-paper-sunken"),
          )}
          style={{ height: alto }}
        >
          {visibles.map((p) => (
            <span
              key={p.id}
              onPointerEnter={() => setEncima(p.id)}
              onPointerLeave={() => setEncima(null)}
              className="h-full transition-[flex-grow,opacity] duration-500 ease-out first:rounded-l-full last:rounded-r-full"
              style={{
                flexGrow: p.valor,
                flexBasis: 0,
                background: p.color,
                opacity: encima && encima !== p.id ? 0.45 : 1,
              }}
            />
          ))}
        </div>
        {actual && (
          <p
            aria-hidden
            className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-control border border-white/10 bg-stage-raised px-2.5 py-1 text-meta text-stage-ink shadow-sheet"
          >
            <span className="font-medium tnum">{porcentaje(actual.valor / total)}</span>{" "}
            <span className="text-stage-3">
              {actual.etiqueta} · {numero(actual.valor)}
            </span>
          </p>
        )}
      </div>
      {leyenda && (
        <Leyenda
          className="mt-3"
          oscuro={oscuro}
          items={partes.map((p) => ({
            id: p.id,
            etiqueta: p.etiqueta,
            color: p.color,
            valor: total > 0 ? porcentaje(p.valor / total) : "—",
          }))}
        />
      )}
      <TablaOculta
        titulo={titulo}
        columnas={["", "Cantidad", "Porcentaje"]}
        filas={partes.map((p) => [
          p.etiqueta,
          numero(p.valor),
          total > 0 ? porcentaje(p.valor / total) : "—",
        ])}
      />
    </div>
  );
}
