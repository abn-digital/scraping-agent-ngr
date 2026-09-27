import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export function Esqueleto({
  className,
  oscuro,
  style,
}: {
  className?: string;
  oscuro?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "relative block overflow-hidden rounded-control",
        oscuro ? "bg-white/[.05]" : "bg-paper-shade",
        // El content va sí o sí: sin él Tailwind no dibuja el pseudo-elemento
        // y el brillo no existe.
        "after:absolute after:inset-0 after:-translate-x-full after:animate-brillo after:content-['']",
        // El degradado se interpola en sRGB, como en Tailwind 3: en oklab la
        // franja blanca se ve más ancha y más fría.
        oscuro
          ? "after:bg-linear-to-r/srgb after:from-transparent after:via-white/[.09] after:to-transparent"
          : "after:bg-linear-to-r/srgb after:from-transparent after:via-white/45 after:to-transparent",
        className,
      )}
    />
  );
}
