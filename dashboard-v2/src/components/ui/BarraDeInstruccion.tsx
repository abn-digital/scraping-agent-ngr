import { useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

export type EstadoDeInstruccion =
  | { tipo: "libre" }
  | { tipo: "trabajando"; instruccion: string }
  | { tipo: "lista" }
  | { tipo: "error"; error: string };

// Todos los estados miden lo mismo: si no, lo que está arriba sube y baja cada
// vez que la barra cambia. El alto sale de --alto-barra del contenedor.
const CAJA =
  "pointer-events-auto mx-auto flex min-h-[var(--alto-barra,60px)] max-w-[860px] items-center rounded-panel bg-stage-raised px-4 py-3";

const entrada = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

// Donde se le pide algo a la IA, sobre el escenario. Enter manda y ⇧ Enter
// corta la línea. Mientras trabaja se ve la instrucción que se mandó; si falla,
// la instrucción no se pierde: se reintenta o se descarta.
export function BarraDeInstruccion({
  estado,
  etiqueta,
  placeholder,
  mensajeListo,
  onMandar,
  onReintentar,
  onDescartar,
  bloqueo,
}: {
  estado: EstadoDeInstruccion;
  /** Qué hace mandar: nombra el campo y el botón para lectores de pantalla. */
  etiqueta: string;
  placeholder: string;
  mensajeListo: string;
  onMandar: (instruccion: string) => void;
  onReintentar: () => void;
  onDescartar: () => void;
  /** Cuando pedir no aplica (se está mirando algo viejo): el porqué y la única salida. */
  bloqueo?: {
    texto: string;
    accion: string;
    icono?: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
    onAccion: () => void;
  };
}) {
  const [valor, setValor] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const trabajando = estado.tipo === "trabajando";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [valor]);

  const mandar = () => {
    const v = valor.trim();
    if (!v || trabajando) return;
    onMandar(v);
    setValor("");
  };

  const IconoBloqueo = bloqueo?.icono ?? RotateCcw;

  return (
    <div className="pointer-events-none w-full">
      <AnimatePresence mode="wait" initial={false}>
        {estado.tipo === "error" ? (
          <motion.div
            key="error"
            {...entrada}
            className={cn(CAJA, "flex-wrap items-center gap-x-4 gap-y-2 bg-fail/15")}
          >
            <span className="h-[7px] w-[7px] shrink-0 bg-fail-soft" aria-hidden />
            <span role="alert" className="min-w-0 flex-1 text-base text-fail-soft">
              {estado.error}
            </span>
            <Button tone="dark" variant="outline" size="sm" onClick={onReintentar}>
              <RotateCcw className="h-3 w-3" strokeWidth={2} aria-hidden />
              Reintentar
            </Button>
            <Button tone="dark" variant="ghost" size="sm" onClick={onDescartar}>
              Descartar
            </Button>
          </motion.div>
        ) : estado.tipo === "lista" ? (
          <motion.p
            key="lista"
            {...entrada}
            role="status"
            className={cn(CAJA, "items-center gap-2 text-base text-stage-ink")}
          >
            <span className="h-[7px] w-[7px] bg-pass" aria-hidden />
            {mensajeListo}
          </motion.p>
        ) : bloqueo ? (
          <motion.div
            key="bloqueo"
            {...entrada}
            transition={{ duration: 0.2 }}
            className={cn(CAJA, "flex-wrap items-center gap-x-4 gap-y-2")}
          >
            <span className="min-w-0 flex-1 text-base text-stage-3">{bloqueo.texto}</span>
            <Tooltip label={bloqueo.accion}>
              <span>
                <Button
                  tone="dark"
                  variant="primary"
                  size="sm"
                  aria-label={bloqueo.accion}
                  onClick={bloqueo.onAccion}
                  className="h-8 w-8 p-0"
                >
                  <IconoBloqueo className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                </Button>
              </span>
            </Tooltip>
          </motion.div>
        ) : (
          <motion.div
            key="libre"
            {...entrada}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto mx-auto max-w-[860px]"
          >
            {/* El anillo al escribir no está en creativos: su regla es que el
                foco siempre se ve, y el campo sin borde no tenía dónde mostrarlo. */}
            <div
              className="flex min-h-[var(--alto-barra,60px)] items-center gap-2 rounded-panel bg-stage-raised px-3.5 py-2.5
                shadow-[0_8px_24px_-12px_rgba(0,0,0,.6)] focus-within:ring-1 focus-within:ring-ember/60"
            >
              <textarea
                ref={ref}
                rows={1}
                value={trabajando ? estado.instruccion : valor}
                disabled={trabajando}
                onChange={(e) => setValor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                    e.preventDefault();
                    mandar();
                  }
                }}
                aria-label={etiqueta}
                placeholder={trabajando ? "" : placeholder}
                className={cn(
                  "max-h-[132px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-base leading-relaxed",
                  "placeholder:text-stage-3 focus:outline-hidden",
                  trabajando ? "text-stage-3" : "text-stage-ink",
                )}
              />
              <Tooltip label={etiqueta}>
                <span>
                  <Button
                    tone="dark"
                    variant="primary"
                    size="sm"
                    aria-label={etiqueta}
                    onClick={mandar}
                    disabled={trabajando || !valor.trim()}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2.4} aria-hidden />
                  </Button>
                </span>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
