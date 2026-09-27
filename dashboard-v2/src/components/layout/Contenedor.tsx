import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * La canaleta y el ancho de toda pantalla del app (px-5 md:px-10, 1320 px), los
 * mismos que usa PageHeader. Para las secciones que van debajo del encabezado.
 */
export function Contenedor({
  children,
  className,
  as: Tag = "section",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div";
  "aria-label"?: string;
}) {
  return (
    <Tag className={cn("px-5 md:px-10", className)} {...rest}>
      <div className="mx-auto max-w-[1320px]">{children}</div>
    </Tag>
  );
}
