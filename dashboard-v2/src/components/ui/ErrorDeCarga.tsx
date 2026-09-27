import { RotateCcw } from "lucide-react";
import { Link } from "react-router";
import { Button } from "./Button";
import { errorMessage, statusOf } from "@/lib/errors";

// Distingue lo que no existe (404) de lo que no llegó: lo primero no se arregla
// reintentando y lo segundo sí.
export function ErrorDeCarga({
  err,
  onRetry,
  recurso,
}: {
  err: unknown;
  onRetry: () => void;
  recurso: { noExiste: string; noLlego: string; volverA: { label: string; to: string } };
}) {
  const noExiste = statusOf(err) === 404;

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-[1320px] place-items-center px-5 md:px-10">
      <div className="max-w-[52ch] text-center">
        <p className="label mb-3">{noExiste ? "404" : "Error"}</p>
        <h1 className="font-display text-h2 font-semibold tracking-[-.025em] text-ink">
          {noExiste ? recurso.noExiste : recurso.noLlego}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-ink-2">
          {noExiste
            ? "Puede que lo hayan borrado, o que el enlace traiga un id viejo."
            : "El pedido no llegó a destino. No se modificó nada."}
        </p>

        {!noExiste && (
          <p className="mt-4 break-words font-mono text-meta text-ink-3">
            {errorMessage(err, "No se pudo conectar con el servidor.")}
          </p>
        )}

        <div className="mt-7 flex justify-center gap-2">
          {!noExiste && (
            <Button variant="primary" onClick={onRetry}>
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Reintentar
            </Button>
          )}
          <Button variant={noExiste ? "primary" : "ghost"} asChild>
            <Link to={recurso.volverA.to}>{recurso.volverA.label}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
