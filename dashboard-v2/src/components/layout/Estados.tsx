import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Mark } from "@/components/ui/Mark";
import { Notice } from "@/components/ui/Notice";
import { errorMessage, statusOf } from "@/lib/errors";

/** Mientras todavía no se sabe si hay sesión: la marca late y nada más. */
export function Splash({ label = "Cargando" }: { label?: string }) {
  return (
    <div
      className="grid min-h-screen place-items-center bg-paper text-ink"
      role="status"
      aria-live="polite"
    >
      <Mark size={34} className="animate-pulse-dot" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Una pantalla que no es de trabajo: sin acceso, cuenta desactivada, algo que
 * no cargó. Titular en h2, el porqué en una línea y la única salida.
 */
export function MensajeCentral({
  eyebrow,
  title,
  children,
  actions,
  fullScreen = false,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  fullScreen?: boolean;
}) {
  const cuerpo = (
    <div className="relative z-[1] max-w-[52ch] text-center">
      {eyebrow && <p className="label mb-3">{eyebrow}</p>}
      <h1 className="font-display text-h2 font-semibold tracking-[-.025em] text-ink">{title}</h1>
      {children && <div className="mt-3 text-base leading-relaxed text-ink-2">{children}</div>}
      {actions && <div className="mt-7 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
  return fullScreen ? (
    <main className="paper-grain grid min-h-screen place-items-center bg-paper px-5">{cuerpo}</main>
  ) : (
    <div className="mx-auto grid min-h-[62vh] max-w-[1320px] place-items-center px-5 md:px-10">
      {cuerpo}
    </div>
  );
}

/** Una sección que no cargó, del tamaño de la sección y no de la página. */
export function ErrorEnLinea({
  error,
  onRetry,
  recurso,
}: {
  error: unknown;
  onRetry?: () => void;
  recurso?: string;
}) {
  const status = statusOf(error);
  const final = status === 403 || status === 404;
  return (
    <Notice
      tone={status === 403 ? "info" : "fail"}
      action={
        onRetry &&
        !final && (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Reintentar
          </Button>
        )
      }
    >
      {errorMessage(error, recurso ? `No se pudo cargar ${recurso}.` : "No se pudo cargar.")}
    </Notice>
  );
}
