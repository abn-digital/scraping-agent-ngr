import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type EstadoDeLamina = "lista" | "vacia" | "trabajando";

// Lo que el producto produce, apoyado en el escenario: sin radio, con la
// sombra de pieza y su proporción real. Mientras se está haciendo de nuevo, la
// versión anterior queda atenuada debajo y una línea ember la recorre: se ve
// que trabaja sin tapar lo que había.
export function Lamina({
  ancho,
  alto,
  src,
  alt,
  estado = "lista",
  className,
  children,
  encima,
}: {
  ancho: number;
  alto: number;
  src?: string | null;
  alt: string;
  estado?: EstadoDeLamina;
  className?: string;
  /** Lo que se muestra en vez de una imagen. */
  children?: ReactNode;
  /** Lo que va arriba de todo: una marca, un botón. */
  encima?: ReactNode;
}) {
  return (
    <div className={cn("relative", className)} style={{ aspectRatio: `${ancho} / ${alto}` }}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          estado === "vacia"
            ? "border border-dashed border-white/15 bg-white/[.02]"
            : "bg-stage-deep shadow-piece ring-1 ring-white/10 transition-shadow duration-200 group-hover:shadow-piece-lift",
        )}
      >
        {children}

        {!children && src && estado !== "vacia" && (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              "h-full w-full object-cover transition-[filter,opacity] duration-300",
              estado === "trabajando" && "opacity-40 blur-[1px] saturate-50",
            )}
          />
        )}

        {estado === "trabajando" && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ y: "-100%" }}
              animate={{ y: "1100%" }}
              transition={{ duration: 2.1, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
              className="h-[9%] w-full bg-linear-to-b/srgb from-transparent via-ember/35 to-transparent"
            />
          </div>
        )}

        {encima}
      </div>
    </div>
  );
}
