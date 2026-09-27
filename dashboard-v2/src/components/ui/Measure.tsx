import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Measure({
  children,
  dark = false,
  className,
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  const line = dark ? "bg-white/20" : "bg-rule-strong";
  const text = dark ? "text-stage-3" : "text-ink-3";

  return (
    <div className={cn("flex w-full items-center gap-1.5", className)}>
      <span className={cn("h-2 w-px shrink-0", line)} />
      <span className={cn("h-px min-w-1.5 flex-1", line)} />
      {/* Sin tamaño de letra: hereda el del contexto, como en creativos (ver
          ORIGEN.md). */}
      <span className={cn("shrink-0 whitespace-nowrap font-mono tnum", text)}>{children}</span>
      <span className={cn("h-px min-w-1.5 flex-1", line)} />
      <span className={cn("h-2 w-px shrink-0", line)} />
    </div>
  );
}
