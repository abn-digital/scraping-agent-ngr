import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export interface Step {
  n: number;
  title: string;
  /** Qué hace el paso. Está siempre, para que la fila no cambie de alto. */
  hint: string;
  /** Qué falta para poder entrar. `null` = se puede entrar. */
  blockedBy: string | null;
}

// Los números y las pistas no fijan tamaño de letra: heredan el del contexto,
// como se ven en creativos (ver ORIGEN.md).
export function Stepper({
  steps,
  current,
  onGo,
}: {
  steps: Step[];
  current: number;
  onGo: (n: number) => void;
}) {
  return (
    <div>
      <ol className="flex items-stretch gap-1" aria-label="Pasos">
        {steps.map((s) => {
          const done = s.n < current;
          const active = s.n === current;
          const locked = s.blockedBy !== null && !done && !active;

          return (
            <li key={s.n} className="min-w-0 flex-1">
              {/* aria-disabled y no disabled: un botón deshabilitado no recibe
                  foco, y el porqué del bloqueo quedaba solo en un title que el
                  teclado y el lector de pantalla no alcanzan. */}
              <button
                onClick={() => !locked && onGo(s.n)}
                aria-disabled={locked || undefined}
                aria-current={active ? "step" : undefined}
                title={locked ? s.blockedBy! : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-left",
                  "transition-colors duration-150",
                  locked ? "cursor-not-allowed" : "hover:bg-paper-sunken",
                )}
              >
                <span
                  className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full font-medium leading-none tnum",
                    "transition-colors duration-200",
                    done
                      ? "bg-ink text-paper-raised"
                      : active
                        ? "bg-ember text-white"
                        : locked
                          ? "border border-rule-strong text-ink-4"
                          : "border border-ink-4 text-ink-3",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-label="Hecho" /> : s.n}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-base leading-tight",
                      active ? "font-medium text-ink" : locked ? "text-ink-4" : "text-ink-2",
                    )}
                  >
                    {s.title}
                  </span>
                  <span
                    className={cn("mt-0.5 block truncate", locked ? "text-ink-4" : "text-ink-3")}
                  >
                    {s.hint}
                  </span>
                  {locked && <span className="sr-only">{s.blockedBy}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div aria-hidden className="mt-2 h-[3px] overflow-hidden rounded-full bg-paper-sunken">
        <motion.span
          className="block h-full rounded-full bg-ember"
          initial={false}
          animate={{ width: `${(current / steps.length) * 100}%` }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
