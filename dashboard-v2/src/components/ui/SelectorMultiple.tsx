import { useMemo, useState, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface OpcionMultiple {
  value: string;
  label: string;
  /** Algo a la izquierda de la etiqueta: el punto del color de la serie, un ícono. */
  marca?: ReactNode;
  grupo?: string;
}

const plegar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Filtrar por varias opciones a la vez (marcas, plataformas). Vacío es
 * "todas": no hay una opción "Todas" que se tilde y destilde, porque eso deja
 * estados que no significan nada ("Todas" y dos más).
 *
 * El disparador dice lo elegido: "Todas las marcas", "Rappi", "3 marcas".
 */
export function SelectorMultiple({
  valores,
  onChange,
  opciones,
  nombre,
  nombrePlural,
  buscar,
  size = "md",
  className,
}: {
  valores: string[];
  onChange: (valores: string[]) => void;
  opciones: OpcionMultiple[];
  /** En singular y minúscula: "marca". */
  nombre: string;
  nombrePlural: string;
  /** Con más de diez opciones aparece la búsqueda sola; esto la fuerza. */
  buscar?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const [q, setQ] = useState("");
  const conBusqueda = buscar ?? opciones.length > 10;
  const elegidas = opciones.filter((o) => valores.includes(o.value));
  const texto =
    elegidas.length === 0
      ? `Todas las ${nombrePlural}`
      : elegidas.length === 1
        ? elegidas[0]!.label
        : `${elegidas.length} ${nombrePlural}`;

  const visibles = useMemo(() => {
    const aguja = plegar(q.trim());
    return aguja ? opciones.filter((o) => plegar(o.label).includes(aguja)) : opciones;
  }, [opciones, q]);

  const alternar = (v: string) =>
    onChange(valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v]);

  return (
    <Popover.Root onOpenChange={(v) => !v && setQ("")}>
      <Popover.Trigger
        aria-label={`Filtrar por ${nombre}: ${texto}`}
        className={cn(
          "inline-flex min-w-0 items-center gap-2 rounded-control border bg-paper-raised text-left text-ink",
          "transition-[border-color,box-shadow] duration-150 hover:border-ink-4",
          "data-[state=open]:border-ink data-[state=open]:ring-2 data-[state=open]:ring-ember/25",
          elegidas.length > 0 ? "border-ink-3" : "border-rule-strong",
          size === "sm" ? "h-8 px-2.5 text-meta" : "h-9 px-3 text-base",
          className,
        )}
      >
        {elegidas.length > 0 && (
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
        )}
        <span className="min-w-0 flex-1 truncate">{texto}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.9} aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={10}
          className="z-50 flex max-h-[min(60vh,420px)] w-[260px] flex-col overflow-hidden rounded-panel bg-stage text-stage-ink
            shadow-sheet ring-1 ring-white/10 data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
        >
          {conBusqueda && (
            <div className="relative border-b border-stage-rule p-1.5">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stage-3"
              />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Buscar ${nombre}`}
                aria-label={`Buscar ${nombre}`}
                className="h-8 w-full rounded-control bg-white/[.06] pl-8 pr-2 text-meta text-stage-ink placeholder:text-stage-3
                  focus:outline-hidden focus:ring-2 focus:ring-ember/40"
              />
            </div>
          )}
          <div
            role="group"
            aria-label={`Elegir ${nombrePlural}`}
            className="scrollbar-thin scrollbar-dark min-h-0 flex-1 overflow-y-auto p-1.5"
          >
            {visibles.length === 0 && (
              <p className="px-3 py-4 text-center text-meta text-stage-3">Sin resultados.</p>
            )}
            {visibles.map((o, i) => {
              const encabezado = o.grupo && o.grupo !== visibles[i - 1]?.grupo ? o.grupo : null;
              const activa = valores.includes(o.value);
              return (
                <div key={o.value}>
                  {encabezado && (
                    <p className="px-3 pb-1 pt-2 text-micro font-medium text-stage-3">
                      {encabezado}
                    </p>
                  )}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={activa}
                    onClick={() => alternar(o.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left text-base transition-colors",
                      "hover:bg-white/10 focus-visible:bg-white/10",
                      activa ? "text-stage-ink" : "text-stage-ink/85",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors",
                        activa ? "border-ember bg-ember text-white" : "border-white/25",
                      )}
                    >
                      {activa && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {o.marca}
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {valores.length > 0 && (
            <div className="border-t border-stage-rule p-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full rounded-control px-2.5 py-1.5 text-left text-meta text-stage-3 transition-colors hover:bg-white/10 hover:text-stage-ink"
              >
                Ver todas las {nombrePlural}
              </button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
