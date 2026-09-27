import { motion } from "motion/react";
import { Check, Clock, Pause, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type EstadoDeAvance = "en-cola" | "corriendo" | "pausado" | "terminado";

export interface NombresDeAvance {
  listos: string;
  fallidos: string;
  pendientes: string;
}

const NOMBRES: NombresDeAvance = {
  listos: "listos",
  fallidos: "fallidos",
  pendientes: "pendientes",
};

function Cuenta({
  icon: Icon,
  n,
  que,
  className,
  conPalabra,
}: {
  icon: typeof Check;
  n: number;
  que: string;
  className: string;
  conPalabra: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-1", className)} title={`${n} ${que}`}>
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.4} aria-hidden />
      {n}
      <span className={conPalabra ? undefined : "sr-only"}>{que}</span>
    </span>
  );
}

// El avance de un trabajo por lotes: la barra, el estado al lado y las cuentas
// debajo. Es el mismo en la lista y adentro del detalle, para que nadie tenga
// que aprender dos formas de leer lo mismo.
export function Avance({
  total,
  listos,
  fallidos,
  estado,
  nombres = NOMBRES,
  grande = false,
  className,
}: {
  total: number;
  listos: number;
  fallidos: number;
  estado: EstadoDeAvance;
  nombres?: NombresDeAvance;
  grande?: boolean;
  className?: string;
}) {
  const pendientes = Math.max(0, total - listos - fallidos);
  const terminado = estado === "terminado" && fallidos === 0;
  const pct = total ? Math.round((listos / total) * 100) : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex flex-1 overflow-hidden rounded-full bg-paper-sunken",
            grande ? "h-2" : "h-1.5",
          )}
        >
          <motion.span
            className="bg-pass"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className="bg-fail" style={{ width: `${total ? (fallidos / total) * 100 : 0}%` }} />
        </span>

        {/* La casilla está siempre, ocupe o no: el ícono de pausa mide el doble
            que el punto de trabajando, y sin reservarle el lugar la fila cambia
            de alto en cada pausa y empuja todo lo de abajo. */}
        <span
          className={cn("grid shrink-0 place-items-center", grande ? "h-4 w-4" : "h-3.5 w-3.5")}
        >
          {/* Macizos y no de contorno: a 14 px un ícono de línea no se lee. */}
          {estado === "corriendo" && (
            <span
              role="img"
              aria-label="Trabajando"
              className={cn(
                "animate-pulse-dot rounded-full bg-ember",
                grande ? "h-2 w-2" : "h-[7px] w-[7px]",
              )}
            />
          )}
          {estado === "pausado" && (
            <Pause
              className="h-full w-full text-ember"
              fill="currentColor"
              strokeWidth={0}
              aria-label="En pausa"
            />
          )}
        </span>
      </div>

      <p
        className={cn(
          "mt-1.5 flex items-center gap-2.5 whitespace-nowrap tnum",
          grande ? "text-base" : "text-meta",
        )}
      >
        <span className={cn("font-medium", terminado ? "text-pass" : "text-ink-2")}>{pct}%</span>
        <span className="ml-auto flex items-center gap-2.5">
          {listos > 0 && (
            <Cuenta
              icon={Check}
              n={listos}
              que={nombres.listos}
              className="text-pass"
              conPalabra={grande}
            />
          )}
          {fallidos > 0 && (
            <Cuenta
              icon={X}
              n={fallidos}
              que={nombres.fallidos}
              className="text-fail"
              conPalabra={grande}
            />
          )}
          {pendientes > 0 && (
            <Cuenta
              icon={Clock}
              n={pendientes}
              que={nombres.pendientes}
              className="text-ink-3"
              conPalabra={grande}
            />
          )}
        </span>
      </p>
    </div>
  );
}

// Un armado en pasos que se guarda solo queda a medio hacer: la lista dice en
// qué paso quedó, en ember, en el lugar donde después va el avance.
export function PasoDelBorrador({ paso, de }: { paso: number; de: number }) {
  return (
    <p className="flex items-center gap-1.5 text-meta tnum text-ember">
      <span className="h-[5px] w-[5px] shrink-0 bg-ember" aria-hidden />
      Paso {paso} de {de}
    </p>
  );
}
