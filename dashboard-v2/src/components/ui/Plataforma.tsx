import { cn } from "@/lib/cn";

export type Plataforma =
  "instagram" | "tiktok" | "facebook" | "youtube" | "twitter" | "x" | "whatsapp" | "email";

const NOMBRE: Record<Plataforma, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  twitter: "X",
  x: "X",
  whatsapp: "WhatsApp",
  email: "Email",
};

export function nombreDePlataforma(p: string | null | undefined): string {
  if (!p) return "—";
  return NOMBRE[p.toLowerCase() as Plataforma] ?? p;
}

/**
 * La plataforma de algo (un post, una cuenta, un comentario), dibujada a trazo
 * en `currentColor` como el resto de los íconos. Sin los colores de cada
 * marca: al lado de ember y de los tonos de estado, un rosa de Instagram o un
 * rojo de YouTube se leerían como una señal que no son. El nombre va en
 * `aria-label` o al lado, nunca solo el ícono.
 */
export function IconoDePlataforma({
  plataforma,
  className,
  strokeWidth = 1.75,
}: {
  plataforma: string | null | undefined;
  className?: string;
  strokeWidth?: number;
}) {
  const p = (plataforma ?? "").toLowerCase() as Plataforma;
  const comun = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: cn("h-4 w-4 shrink-0", className),
  };
  switch (p) {
    case "instagram":
      return (
        <svg {...comun}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...comun}>
          <path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8" />
          <path d="M14 3.5c.4 2.6 2.2 4.4 5 4.7" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...comun}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M13.2 20.4v-7.6h2.6M13.2 12.8H10.6M13.2 20.4V10.2c0-1.4.8-2.2 2.2-2.2h1" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...comun}>
          <rect x="2.8" y="5.5" width="18.4" height="13" rx="4" />
          <path d="m10.3 9.4 4.6 2.6-4.6 2.6z" />
        </svg>
      );
    case "twitter":
    case "x":
      return (
        <svg {...comun}>
          <path d="M4.5 4.5 19.5 19.5M19.5 4.5l-6.4 6.9M10.9 12.6 4.5 19.5" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...comun}>
          <path d="M4 20l1.3-4A8.5 8.5 0 1 1 8.4 19z" />
          <path d="M9.2 8.6c0 3.3 2.9 6.2 6.2 6.2l1.1-1.5-2-1-.9.9c-1-.4-1.8-1.2-2.2-2.2l.9-.9-1-2z" />
        </svg>
      );
    case "email":
      return (
        <svg {...comun}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    default:
      return (
        <svg {...comun}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.4 3.6 8.5s-1.2 5.9-3.6 8.5c-2.4-2.6-3.6-5.4-3.6-8.5S9.6 6.1 12 3.5z" />
        </svg>
      );
  }
}
