import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Dialog as D } from "radix-ui";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import type { Variante } from "@/components/layout/Shell";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

export interface Espacio {
  id: string;
  nombre: string;
  /** Lo que va debajo del nombre en la lista: "3 marcas", "Perú". */
  detalle?: string;
  /** El logo, si lo hay. Sin logo va la inicial. */
  logo?: string | null;
  inactivo?: boolean;
}

const plegar = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Insignia({ espacio, size }: { espacio: Espacio | null; size: number }) {
  if (espacio?.logo)
    return (
      <img
        src={espacio.logo}
        alt=""
        style={{ width: size, height: size }}
        className="shrink-0 rounded-[8px] bg-paper-raised object-contain shadow-hair"
      />
    );
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "grid shrink-0 place-items-center rounded-[8px] font-display font-semibold",
        espacio ? "bg-ink text-paper-raised" : "border border-dashed border-rule-strong",
        size >= 28 ? "text-base" : "text-meta",
      )}
    >
      {espacio?.nombre[0]?.toUpperCase()}
    </span>
  );
}

/**
 * El cliente, la marca o la empresa con la que se está trabajando. Es un
 * contexto y no un campo: decide qué datos se ven en toda la app. Por eso vive
 * arriba del riel, como un espacio de trabajo, y no en cada pantalla.
 *
 * Es un diálogo y no un menú: el menú de Radix se queda con las teclas para su
 * búsqueda por letra y el campo de búsqueda no se podía escribir.
 */
export function SelectorDeEspacio({
  actual,
  espacios,
  variante,
  riel,
  onElegir,
  etiqueta = "cliente",
  pie,
}: {
  actual: Espacio | null;
  espacios: Espacio[];
  variante: Variante;
  riel: number;
  onElegir: (id: string) => void;
  /** Cómo se llama lo que se elige, en singular y minúscula: "cliente", "marca", "empresa". */
  etiqueta?: string;
  /** Una acción al pie de la lista ("Nuevo cliente"). */
  pie?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  // Con uno solo no hay nada que elegir: se muestra, no se abre.
  const unico = espacios.length <= 1;

  const visibles = useMemo(() => {
    const aguja = plegar(query.trim());
    return [...espacios]
      .filter((e) => !aguja || plegar(e.nombre).includes(aguja) || e.id.includes(aguja))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [espacios, query]);

  const elegir = (e: Espacio) => {
    setOpen(false);
    setQuery("");
    if (e.id !== actual?.id) onElegir(e.id);
  };

  const filas = () =>
    Array.from(list.current?.querySelectorAll<HTMLButtonElement>("[data-espacio]") ?? []);

  const onTeclaBusqueda = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      filas()[0]?.focus();
    } else if (event.key === "Enter") {
      event.preventDefault();
      filas()[0]?.click();
    }
  };

  const onTeclaLista = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const todas = filas();
    const i = todas.indexOf(document.activeElement as HTMLButtonElement);
    const sig = event.key === "ArrowDown" ? i + 1 : i - 1;
    if (sig < 0) document.getElementById("buscar-espacio")?.focus();
    else todas[Math.min(sig, todas.length - 1)]?.focus();
  };

  const aria = actual
    ? `${etiqueta[0]?.toUpperCase()}${etiqueta.slice(1)}: ${actual.nombre}. Cambiar`
    : `Elegir ${etiqueta}`;

  const disparador =
    variante === "compacto" ? (
      <button
        type="button"
        aria-label={aria}
        disabled={unico}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-control transition-colors hover:bg-paper-sunken/70 disabled:hover:bg-transparent"
      >
        <Insignia espacio={actual} size={30} />
      </button>
    ) : variante === "barra" ? (
      <button
        type="button"
        aria-label={aria}
        disabled={unico}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-paper-sunken/70"
      >
        <Insignia espacio={actual} size={24} />
        <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">
          {actual?.nombre ?? `Elegí ${etiqueta}`}
        </span>
        {!unico && (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    ) : (
      <button
        type="button"
        aria-label={aria}
        disabled={unico}
        className="flex w-full shrink-0 items-center gap-2.5 rounded-control border border-rule bg-paper-raised px-2.5 py-2 text-left
          transition-colors hover:border-rule-strong disabled:hover:border-rule"
      >
        <Insignia espacio={actual} size={30} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-base font-medium text-ink">
            {actual?.nombre ?? `Elegí ${etiqueta}`}
          </span>
          <span className="block truncate text-micro text-ink-3">
            {actual?.detalle ??
              (actual
                ? `${etiqueta[0]?.toUpperCase()}${etiqueta.slice(1)}`
                : `${espacios.length} disponibles`)}
          </span>
        </span>
        {!unico && (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    );

  if (unico) return disparador;

  return (
    <D.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setQuery("");
      }}
    >
      {variante === "compacto" ? (
        <Tooltip label={actual?.nombre ?? `Elegir ${etiqueta}`} side="right">
          <D.Trigger asChild>{disparador}</D.Trigger>
        </Tooltip>
      ) : (
        <D.Trigger asChild>{disparador}</D.Trigger>
      )}

      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/25 data-[state=open]:animate-fade data-[state=closed]:animate-fade-out md:bg-ink/10" />
        <D.Content
          aria-describedby={undefined}
          style={{ ["--rail" as string]: `${riel}px` }}
          className="fixed left-3 right-3 top-[60px] z-50 flex max-h-[min(72vh,560px)] flex-col overflow-hidden rounded-panel
            border border-rule bg-paper-raised shadow-sheet focus:outline-hidden
            data-[state=open]:animate-rise data-[state=closed]:animate-fade-out
            md:left-[calc(var(--rail)+10px)] md:right-auto md:top-3 md:w-[340px]"
        >
          <D.Title className="sr-only">Cambiar de {etiqueta}</D.Title>

          <div className="relative border-b border-rule p-2">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
            />
            <input
              id="buscar-espacio"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onTeclaBusqueda}
              placeholder={`Buscar ${etiqueta}`}
              aria-label={`Buscar ${etiqueta}`}
              className="h-10 w-full rounded-control bg-paper-sunken/60 pl-9 pr-3 text-base text-ink placeholder:text-ink-4
                focus:bg-paper-sunken focus:outline-hidden focus:ring-2 focus:ring-ember/25"
            />
          </div>

          <ul
            ref={list}
            onKeyDown={onTeclaLista}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5"
          >
            {visibles.length === 0 && (
              <li className="px-3 py-6 text-center text-meta text-ink-3">
                Ningún {etiqueta} con "{query.trim()}".
              </li>
            )}
            {visibles.map((e) => {
              const activo = e.id === actual?.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    data-espacio
                    aria-current={activo || undefined}
                    onClick={() => elegir(e)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-base transition-colors",
                      "hover:bg-paper-sunken focus-visible:bg-paper-sunken",
                      activo ? "text-ink" : e.inactivo ? "text-ink-4" : "text-ink-2",
                    )}
                  >
                    <Insignia espacio={e} size={22} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className={cn("block truncate", activo && "font-medium")}>
                        {e.nombre}
                      </span>
                      {e.detalle && (
                        <span className="block truncate text-micro text-ink-3">{e.detalle}</span>
                      )}
                    </span>
                    {activo && (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-ember"
                        strokeWidth={2.4}
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {pie && <div className="border-t border-rule p-1.5">{pie}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
