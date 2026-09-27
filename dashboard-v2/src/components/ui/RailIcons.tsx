import type { CSSProperties, SVGProps } from "react";
import { cn } from "@/lib/cn";

// Íconos del riel. Un ícono de sección se dibuja a trazo y tiene UNA forma que
// se rellena de ember cuando la sección está activa: es la única aparición del
// color de marca en la navegación, y dice "estás acá" sin un fondo de color.
// Para agregar una sección, copiá la forma de estos: trazo de 1.75, y la forma
// que se llena con `relleno(activo, desde)`.

export interface IconoDeRielProps {
  className?: string;
  strokeWidth?: number;
  activo?: boolean;
}

const base = (strokeWidth = 1.75) => ({
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function relleno(
  activo: boolean | undefined,
  desde: string,
  origen = "bottom",
): SVGProps<never> {
  return {
    stroke: "none",
    className: cn("transition-[fill,transform] duration-300 ease-out", activo && "fill-ember"),
    style: {
      transformBox: "fill-box",
      transformOrigin: origen,
      transform: activo ? "none" : desde,
      fill: activo ? undefined : "transparent",
      transitionDelay: activo ? "60ms" : "0ms",
    } as CSSProperties,
  };
}

export function InicioIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <rect x="6.5" y="13" width="11" height="7.5" rx="1" {...relleno(activo, "scaleY(0)")} />
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v10.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9" />
    </svg>
  );
}

export function ArchivosIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <path d="M4.5 18.5 8.5 13l3.5 3.5 2.5-2.5 5 4.5z" {...relleno(activo, "scaleY(0)")} />
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="m3.5 17.5 5-5.5 3.5 3.5 2.5-2.5 6 6" />
      <circle cx="15.5" cy="9" r="1.5" />
    </svg>
  );
}

export function UsoIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <rect x="4" y="12" width="4" height="8" rx="1" {...relleno(activo, "scaleY(0)")} />
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="7" width="4" height="13" rx="1" />
      <rect x="16" y="3.5" width="4" height="16.5" rx="1" />
    </svg>
  );
}

// Price Intelligence: la comparativa es una balanza (se llena el platillo
// propio), la revisión una tablilla (se llena el broche) y las tiendas un local
// (se llena el toldo).
export function ComparativaIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <path d="M2.5 14h6a3 3 0 0 1-6 0z" {...relleno(activo, "scale(0)", "top")} />
      <path d="M12 4v16.5M8 20.5h8M5.5 6.5h13" />
      <path d="M5.5 6.5 2.5 14h6zM18.5 6.5l-3 7.5h6z" />
      <path d="M2.5 14h6a3 3 0 0 1-6 0zM15.5 14h6a3 3 0 0 1-6 0z" />
    </svg>
  );
}

export function RevisionIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <rect x="8.5" y="2.5" width="7" height="4" rx="1" {...relleno(activo, "scaleY(0)")} />
      <path d="M8.5 4.5H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 18 4.5h-2.5" />
      <rect x="8.5" y="2.5" width="7" height="4" rx="1" />
      <path d="m8.5 13.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

export function TiendasIcon({ className, strokeWidth, activo }: IconoDeRielProps) {
  return (
    <svg className={className} {...base(strokeWidth)}>
      <path d="M3.5 9 5 3.5h14L20.5 9z" {...relleno(activo, "scaleY(0)", "top")} />
      <path d="M3.5 9 5 3.5h14L20.5 9M3.5 9h17M3.5 9a2.83 2.83 0 0 0 5.67 0 2.83 2.83 0 0 0 5.66 0 2.83 2.83 0 0 0 5.67 0" />
      <path d="M5 11.5v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <path d="M10 20.5V15h4v5.5" />
    </svg>
  );
}
