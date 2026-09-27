import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { variacion } from "@/lib/datos";

/**
 * Una diferencia en una celda o una línea: la flecha y el porcentaje con signo.
 * El tono es el estado de la diferencia (pass, fail o neutro), no una serie:
 * contra la competencia, estar más caro es fail. Es la misma lectura que la
 * variación de `Cifra`, del tamaño de una tabla.
 */
export function Delta({
  valor,
  tono = "neutral",
  oscuro = false,
  className,
}: {
  valor: number | null | undefined;
  tono?: "pass" | "fail" | "neutral";
  oscuro?: boolean;
  className?: string;
}) {
  if (valor == null || Number.isNaN(valor))
    return <span className={oscuro ? "text-stage-3" : "text-ink-4"}>—</span>;
  const Flecha = Math.abs(valor) < 0.0005 ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-end gap-0.5 font-medium tnum",
        tono === "pass" && (oscuro ? "text-pass-soft" : "text-pass"),
        tono === "fail" && (oscuro ? "text-fail-soft" : "text-fail"),
        tono === "neutral" && (oscuro ? "text-stage-ink" : "text-ink-2"),
        className,
      )}
    >
      <Flecha className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      {variacion(valor)}
    </span>
  );
}
