import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Paginador({
  pagina,
  total,
  porPagina,
  onPagina,
  etiqueta = "Páginas",
}: {
  pagina: number;
  total: number;
  porPagina: number;
  onPagina: (n: number) => void;
  etiqueta?: string;
}) {
  const paginas = Math.ceil(total / porPagina);
  if (paginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <nav aria-label={etiqueta} className="flex flex-wrap items-center justify-between gap-4">
      <span className="text-meta tnum text-ink-3">
        {desde}–{hasta} de {total}
      </span>

      <div className="flex items-center gap-1">
        <Flecha
          etiqueta="Página anterior"
          disabled={pagina === 1}
          onClick={() => onPagina(pagina - 1)}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Flecha>

        {numeros(pagina, paginas).map((n, i) =>
          n === null ? (
            <span key={`hueco-${i}`} className="px-1 text-meta text-ink-4" aria-hidden>
              ·
            </span>
          ) : (
            <button
              key={n}
              onClick={() => onPagina(n)}
              aria-current={n === pagina ? "page" : undefined}
              aria-label={`Página ${n}`}
              className={cn(
                // Sin tamaño de letra: hereda el del contexto, como en creativos
                // (ver ORIGEN.md).
                "grid h-8 min-w-8 place-items-center rounded-control px-2 tnum",
                "transition-colors duration-150",
                n === pagina
                  ? "bg-ink font-medium text-paper-raised"
                  : "text-ink-2 hover:bg-paper-sunken hover:text-ink",
              )}
            >
              {n}
            </button>
          ),
        )}

        <Flecha
          etiqueta="Página siguiente"
          disabled={pagina === paginas}
          onClick={() => onPagina(pagina + 1)}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Flecha>
      </div>
    </nav>
  );
}

function Flecha({
  etiqueta,
  disabled,
  onClick,
  children,
}: {
  etiqueta: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="grid h-8 w-8 place-items-center rounded-control text-ink-2
        transition-colors duration-150 hover:bg-paper-sunken hover:text-ink
        disabled:pointer-events-none disabled:text-ink-4/50"
    >
      {children}
    </button>
  );
}

function numeros(actual: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const cerca = new Set([1, total, actual, actual - 1, actual + 1]);
  const salida: (number | null)[] = [];
  let hueco = false;

  for (let n = 1; n <= total; n++) {
    if (cerca.has(n)) {
      salida.push(n);
      hueco = false;
    } else if (!hueco) {
      salida.push(null);
      hueco = true;
    }
  }
  return salida;
}
