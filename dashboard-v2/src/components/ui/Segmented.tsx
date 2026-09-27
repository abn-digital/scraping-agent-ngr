import { motion, useReducedMotion } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from "react";
import { useDesborde } from "@/hooks/useDesborde";
import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  dark = false,
  size = "md",
  className,
  ariaLabel,
  plano = false,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon; count?: number; glyph?: ReactNode }[];
  dark?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel: string;
  /** Sin fondo propio: lo pone quien lo envuelve, para que la barra sea una sola. */
  plano?: boolean;
}) {
  // El layoutId lleva la etiqueta del control, no solo el useId.
  //
  // useId devuelve una posición en el árbol y dos pantallas distintas pueden
  // producir la misma: al navegar, el Shell desmonta una y monta la otra en el
  // mismo commit, motion las toma por el mismo elemento y el indicador cruza la
  // pantalla entera desde donde estaba en la pantalla anterior.
  const id = `${ariaLabel}-${useId()}`;

  // Una tira que se corta sin avisar es contenido invisible: con diez opciones,
  // las del final no existen para quien mira.
  const { ref, inicio, fin } = useDesborde<HTMLDivElement>();
  const activoRef = useRef<HTMLButtonElement>(null);
  const quieto = useReducedMotion() ?? false;

  // La elegida se trae a la vista: al agregar una opción nueva queda fuera del
  // recorte y la tira no muestra dónde estás parado. Se mueve solo el
  // contenedor, no `scrollIntoView`, que arrastraría también la página.
  useEffect(() => {
    const el = activoRef.current;
    const caja = ref.current;
    if (!el || !caja) return;

    const margen = 24;
    const izq = el.offsetLeft;
    const der = izq + el.offsetWidth;
    const comportamiento = quieto ? "auto" : "smooth";

    if (izq < caja.scrollLeft + margen) {
      caja.scrollTo({ left: Math.max(0, izq - margen), behavior: comportamiento });
    } else if (der > caja.scrollLeft + caja.clientWidth - margen) {
      caja.scrollTo({ left: der - caja.clientWidth + margen, behavior: comportamiento });
    }
  }, [value, options.length, ref, quieto]);

  // El velo tiene que ser el color exacto del fondo del control. En oscuro ese
  // fondo es blanco al 6% sobre el escenario, así que se calcula igual.
  // Es un grupo de opciones, no pestañas: no hay un panel que cambie con cada
  // una. Como en un grupo de radios nativo, Tab entra a la elegida y las
  // flechas eligen la vecina.
  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const destino = {
      ArrowRight: i + 1,
      ArrowDown: i + 1,
      ArrowLeft: i - 1,
      ArrowUp: i - 1,
      Home: 0,
      End: options.length - 1,
    }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    const siguiente = options[(destino + options.length) % options.length];
    if (!siguiente) return;
    onChange(siguiente.value);
    requestAnimationFrame(() => activoRef.current?.focus());
  };

  const velo = dark
    ? "color-mix(in srgb, var(--color-white) 6%, var(--color-stage))"
    : "var(--color-paper-sunken)";

  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      <div
        ref={ref}
        role="radiogroup"
        aria-label={ariaLabel}
        onKeyDown={alTeclear}
        className={cn(
          "inline-flex w-full min-w-0 max-w-full items-center gap-0.5 overflow-x-auto",
          "scrollbar-none rounded-control p-0.5",
          plano ? "bg-transparent" : dark ? "bg-white/[.06]" : "border border-rule bg-paper-sunken",
        )}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              ref={active ? activoRef : undefined}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(o.value)}
              aria-label={o.icon ? o.label : undefined}
              title={o.icon ? o.label : undefined}
              className={cn(
                "relative shrink-0 whitespace-nowrap rounded-control-inner font-medium",
                "transition-colors duration-150",
                // Sin tamaño de letra: hereda el del contexto, como en creativos
                // (ver ORIGEN.md).
                size === "sm" ? "h-6" : "h-7",
                o.icon ? (size === "sm" ? "w-6" : "w-8") : size === "sm" ? "px-2" : "px-2.5",
                active
                  ? dark
                    ? "text-stage"
                    : "text-paper-raised"
                  : dark
                    ? "text-stage-3 hover:text-stage-ink"
                    : "text-ink-3 hover:text-ink",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`seg-${id}`}
                  // Solo se mueve cuando cambia la opción elegida. Sin esto se
                  // anima ante cualquier reacomodo de la página: al entrar a una
                  // pantalla, mientras la lista carga y el control baja de lugar,
                  // el indicador bajaba deslizándose desde el techo.
                  layoutDependency={value}
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                  className={cn(
                    "absolute inset-0 rounded-control-inner",
                    dark ? "bg-stage-ink" : "bg-ink",
                  )}
                />
              )}
              <span className="relative flex items-center justify-center gap-1.5">
                {o.glyph}
                {o.icon ? <o.icon className="h-4 w-4" strokeWidth={1.9} aria-hidden /> : o.label}
                {o.count !== undefined && (
                  <span
                    className={cn("font-mono text-nano tnum", active ? "opacity-60" : "opacity-55")}
                  >
                    {o.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {(["izq", "der"] as const).map((lado) => (
        <span
          key={lado}
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 w-12 rounded-control transition-opacity duration-200",
            lado === "izq" ? "left-0" : "right-0",
            (lado === "izq" ? inicio : fin) ? "opacity-100" : "opacity-0",
          )}
          style={{
            background: `linear-gradient(to ${lado === "izq" ? "right" : "left"}, ${velo}, transparent)`,
          }}
        />
      ))}
    </div>
  );
}
