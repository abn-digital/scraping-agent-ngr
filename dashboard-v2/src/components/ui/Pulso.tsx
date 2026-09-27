import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// El estado de un trabajo en una línea: un punto y lo que pasa. Late mientras
// está en curso (ember, porque es actividad); quieto y rojo si falló.
export function Pulso({
  estado,
  children,
  oscuro = false,
}: {
  estado: "en-curso" | "fallo" | "listo";
  children: ReactNode;
  oscuro?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-meta",
        estado === "en-curso" && "text-ember",
        estado === "fallo" && (oscuro ? "text-fail-soft" : "text-fail"),
        estado === "listo" && (oscuro ? "text-stage-3" : "text-ink-3"),
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          estado === "en-curso" && "animate-pulse-dot bg-ember",
          estado === "fallo" && (oscuro ? "bg-fail-soft" : "bg-fail"),
          estado === "listo" && "bg-pass",
        )}
      />
      {children}
    </span>
  );
}
