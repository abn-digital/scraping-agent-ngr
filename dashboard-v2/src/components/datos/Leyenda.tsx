import { cn } from "@/lib/cn";

export interface ItemDeLeyenda {
  id: string;
  etiqueta: string;
  color: string;
  /** Un valor al lado del nombre: el total, el porcentaje. */
  valor?: string;
}

/**
 * La leyenda está siempre que hay dos series o más: el color solo no alcanza
 * para saber cuál es cuál. El texto va en tinta, nunca en el color de la serie:
 * la identidad la lleva la marca de al lado.
 *
 * Con `onAlternar`, cada ítem prende y apaga su serie; apagada queda en gris,
 * con su color de siempre para cuando vuelva.
 */
export function Leyenda({
  items,
  forma = "rect",
  oscuro = false,
  apagadas,
  onAlternar,
  className,
}: {
  items: ItemDeLeyenda[];
  forma?: "rect" | "linea";
  oscuro?: boolean;
  apagadas?: Set<string>;
  onAlternar?: (id: string) => void;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-meta", className)}>
      {items.map((it) => {
        const apagada = apagadas?.has(it.id) ?? false;
        const contenido = (
          <>
            <span
              aria-hidden
              className={cn(
                "shrink-0 transition-opacity",
                forma === "rect" ? "h-2.5 w-2.5 rounded-[3px]" : "h-[2px] w-3.5 rounded-full",
                apagada && "opacity-30",
              )}
              style={{ background: it.color }}
            />
            <span
              className={cn(
                oscuro ? "text-stage-ink" : "text-ink-2",
                apagada && (oscuro ? "text-stage-3" : "text-ink-4"),
              )}
            >
              {it.etiqueta}
            </span>
            {it.valor && (
              <span className={cn("tnum", oscuro ? "text-stage-3" : "text-ink-3")}>{it.valor}</span>
            )}
          </>
        );
        return (
          <li key={it.id}>
            {onAlternar ? (
              <button
                type="button"
                aria-pressed={!apagada}
                onClick={() => onAlternar(it.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-chip px-1 py-0.5 transition-colors",
                  oscuro ? "hover:bg-white/[.07]" : "hover:bg-paper-sunken",
                )}
              >
                {contenido}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-1 py-0.5">{contenido}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
