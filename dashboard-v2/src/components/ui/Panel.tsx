import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Una sección de un tablero: un gráfico, una tabla, un resumen. Se apoya en el
 * papel levantado con la sombra corta de las tarjetas, sin borde: es lo que
 * separa una pieza de la otra sin trazar reglas.
 *
 * `oscuro` la pasa al escenario: para lo que el producto muestra como objeto
 * (el último informe, la alerta que importa ahora), no para darle peso a un
 * gráfico cualquiera. En una pantalla, uno como mucho.
 */
export function Panel({
  titulo,
  bajada,
  acciones,
  pie,
  oscuro = false,
  plano = false,
  className,
  cuerpo,
  children,
  as: Tag = "section",
}: {
  titulo?: ReactNode;
  bajada?: ReactNode;
  acciones?: ReactNode;
  pie?: ReactNode;
  oscuro?: boolean;
  /** Sin relleno propio, para una tabla o una lista que llega hasta el borde. */
  plano?: boolean;
  className?: string;
  cuerpo?: string;
  children: ReactNode;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        "relative flex min-w-0 flex-col rounded-panel",
        oscuro ? "stage-grid bg-stage text-stage-ink shadow-studio" : "bg-paper-raised shadow-card",
        className,
      )}
    >
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5">
          <div className="min-w-0">
            {titulo && (
              <h2
                className={cn(
                  "font-display text-h3 font-semibold",
                  oscuro ? "text-stage-ink" : "text-ink",
                )}
              >
                {titulo}
              </h2>
            )}
            {bajada && (
              <p className={cn("mt-0.5 text-meta", oscuro ? "text-stage-3" : "text-ink-3")}>
                {bajada}
              </p>
            )}
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div
        className={cn(
          "min-w-0 flex-1",
          !plano && "px-5 pb-5",
          !plano && (titulo || acciones) && "pt-4",
          cuerpo,
        )}
      >
        {children}
      </div>
      {pie && (
        <footer
          className={cn(
            "px-5 py-3 text-meta",
            oscuro ? "border-t border-stage-rule text-stage-3" : "rule-t text-ink-3",
          )}
        >
          {pie}
        </footer>
      )}
    </Tag>
  );
}
