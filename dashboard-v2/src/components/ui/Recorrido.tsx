import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "./Button";
import { cn } from "@/lib/cn";

export interface PasoDelRecorrido {
  title: string;
  what: string;
  /** Cuánto se queda en pantalla antes de avanzar solo. */
  ms: number;
}

// "Cómo funciona": los pasos a la izquierda, una escena en el escenario a la
// derecha. La escena es una maqueta declarada (bloques, no capturas reales)
// para no prometer un resultado concreto.
export function Recorrido({
  titulo,
  bajada,
  pasos,
  escena,
  claveDeEscena = (paso) => String(paso),
  onFinish,
  finishLabel,
}: {
  titulo: string;
  bajada: string;
  pasos: PasoDelRecorrido[];
  escena: (paso: number, quieto: boolean) => ReactNode;
  /** Pasos con la misma clave comparten escena y la animan en vez de reemplazarla. */
  claveDeEscena?: (paso: number) => string;
  onFinish: () => void;
  finishLabel: string;
}) {
  const [paso, setPaso] = useState(1);
  const [manual, setManual] = useState(false);
  const quieto = useReducedMotion() ?? false;
  const ultimo = paso === pasos.length;
  const indicador = `paso-activo-${useId()}`;

  // Avanza solo hasta que el usuario toca un paso o llega al último: no es un loop.
  useEffect(() => {
    if (manual || quieto || ultimo) return;
    const t = window.setTimeout(() => setPaso((p) => p + 1), pasos[paso - 1]?.ms ?? 3600);
    return () => window.clearTimeout(t);
  }, [paso, manual, quieto, ultimo, pasos]);

  const elegir = (n: number) => {
    setManual(true);
    setPaso(n);
  };

  return (
    <section className="mx-auto w-full max-w-[1320px] px-5 md:px-10">
      <div className="min-w-0">
        <p className="label text-ink-3">
          Paso <span className="tnum text-ink-2">{paso}</span> de {pasos.length}
        </p>
        <h2 className="mt-2 font-display text-h2 font-semibold tracking-[-.025em] text-ink">
          {titulo}
        </h2>
        <p className="mt-2 text-balance text-base text-ink-2">{bajada}</p>
      </div>

      {/* Una sola barra continua: varios tramos se leerían como llenándose de a
          uno al saltar pasos. */}
      <div aria-hidden className="mt-6 h-[3px] overflow-hidden rounded-full bg-paper-sunken">
        <motion.span
          className="block h-full rounded-full bg-ember"
          initial={false}
          animate={{ width: `${(paso / pasos.length) * 100}%` }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Medida fija y no minmax: con minmax(0,…) la lista se encoge al crecer
          el escenario. */}
      <div className="mt-9 grid items-center gap-10 md:grid-cols-[380px_minmax(0,1fr)] md:gap-14">
        <div className="min-w-0">
          <ol className="space-y-0.5">
            {pasos.map((p, i) => {
              const n = i + 1;
              const activo = n === paso;
              return (
                <li key={p.title}>
                  <button
                    onClick={() => elegir(n)}
                    aria-current={activo}
                    className={cn(
                      "relative block w-full rounded-control px-3 py-2.5 text-left",
                      "transition-colors duration-150",
                      activo ? "text-ink" : "hover:bg-paper-sunken/40",
                    )}
                  >
                    {activo && (
                      <motion.span
                        layoutId={indicador}
                        transition={{ type: "spring", stiffness: 520, damping: 44 }}
                        className="absolute inset-0 -z-10 rounded-control bg-paper-sunken"
                      />
                    )}
                    <span className="flex items-baseline gap-2.5">
                      <span
                        className={cn(
                          "shrink-0 font-mono text-micro tnum transition-colors",
                          activo ? "text-ember" : "text-ink-4",
                        )}
                      >
                        {String(n).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "text-base transition-colors",
                          activo ? "text-ink" : "text-ink-2",
                        )}
                      >
                        {p.title}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Fuera de la lista: adentro, el paso activo medía más que los demás. */}
          <p className="mt-5 min-h-[76px] max-w-[46ch] px-3 text-meta leading-relaxed text-ink-2">
            {pasos[paso - 1]?.what}
          </p>
        </div>

        <div className="stage-grid flex h-[360px] min-w-0 items-center justify-center overflow-hidden rounded-panel bg-stage p-6 md:p-8">
          {/* Sin AnimatePresence: con mode="wait" una salida interrumpida por
              clicks rápidos entre pasos deja el panel sin mostrar nada. Cambiar
              la key alcanza: React desmonta y monta lo nuevo animado. */}
          <motion.div
            key={claveDeEscena(paso)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="flex w-full justify-center"
          >
            {escena(paso, quieto)}
          </motion.div>
        </div>
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          disabled={paso === 1}
          onClick={() => {
            setManual(true);
            setPaso((p) => Math.max(1, p - 1));
          }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          Atrás
        </Button>

        {/* Un solo botón que cambia de texto, no dos que se reemplazan. */}
        <Button variant="primary" onClick={ultimo ? onFinish : () => elegir(paso + 1)}>
          <motion.span layout="position" className="inline-flex items-center gap-2">
            <motion.span
              key={ultimo ? "fin" : "siguiente"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            >
              {ultimo ? finishLabel : "Siguiente"}
            </motion.span>
            {ultimo ? (
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
            ) : (
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            )}
          </motion.span>
        </Button>
      </div>
    </section>
  );
}
