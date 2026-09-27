import { FileUp, X } from "lucide-react";
import { useEffect, useId, useMemo, useState, type DragEvent } from "react";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/cn";

const pesoLegible = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

// Elegir un archivo: soltarlo o abrir el diálogo del sistema. Valida antes de
// aceptarlo para no gastar una subida que ya se sabe que va a rebotar.
export function ZonaDeArchivo({
  file,
  onFile,
  accept,
  validar,
  descripcion,
  invitacion,
  dark = false,
  className,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  /** Lo que ofrece el diálogo del sistema, como el atributo accept. */
  accept: string;
  /** Devuelve el motivo del rechazo, o null si sirve. */
  validar: (f: File) => string | null;
  /** Qué entra y cuánto pesa como máximo. */
  descripcion: string;
  /** El texto grande de la zona ("Arrastrá una imagen, o elegila"). */
  invitacion: string;
  /** Sobre el escenario, donde el papel claro no va. */
  dark?: boolean;
  className?: string;
}) {
  const id = useId();
  const [encima, setEncima] = useState(false);

  // La miniatura sale del archivo elegido, sin pasar por el servidor. El objeto
  // se libera al cambiarlo o al desmontar: si no, queda tomado hasta recargar.
  const vistaPrevia = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia]);

  const elegir = (f: File | null | undefined) => {
    if (!f) return;
    const problema = validar(f);
    if (problema) return void aviso.error(problema);
    onFile(f);
  };

  return (
    <div className={className}>
      <input
        id={id}
        type="file"
        accept={accept}
        className="peer sr-only"
        onChange={(e) => elegir(e.target.files?.[0])}
      />

      {file ? (
        <div
          className={cn(
            "flex items-center gap-4 rounded-panel p-3",
            dark ? "bg-white/[.05]" : "bg-paper-sunken/60",
          )}
        >
          <span
            className={cn(
              "grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-control",
              dark ? "bg-white/[.06]" : "bg-paper-raised",
            )}
          >
            {vistaPrevia ? (
              <img src={vistaPrevia} alt="" className="h-full w-full object-contain" />
            ) : (
              <FileUp className="h-6 w-6 text-ink-4" strokeWidth={1.6} aria-hidden />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-base font-medium",
                dark ? "text-stage-ink" : "text-ink",
              )}
            >
              {file.name}
            </span>
            <span
              className={cn("mt-0.5 block text-meta tnum", dark ? "text-stage-3" : "text-ink-3")}
            >
              {pesoLegible(file.size)}
            </span>
            <label
              htmlFor={id}
              className={cn(
                "mt-2 inline-flex cursor-pointer items-center rounded-control px-2.5 py-1 text-meta",
                "transition-colors",
                dark
                  ? "bg-white/[.12] text-stage-ink hover:bg-white/[.2]"
                  : "bg-paper-raised text-ink hover:bg-white",
              )}
            >
              Cambiar
            </label>
          </span>

          <button
            onClick={() => onFile(null)}
            aria-label="Sacar el archivo elegido"
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center self-start rounded-control transition-colors",
              dark
                ? "text-stage-3 hover:bg-white/[.08] hover:text-stage-ink"
                : "text-ink-3 hover:bg-paper-raised hover:text-ink",
            )}
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : (
        /* Un label nativo y no un botón con ref.click(): el diálogo del sistema
           lo abre el browser por la asociación label/input, sin depender de que
           el modal deje pasar el click sintético. */
        <label
          htmlFor={id}
          onDragOver={(e: DragEvent) => {
            e.preventDefault();
            setEncima(true);
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={(e: DragEvent) => {
            e.preventDefault();
            setEncima(false);
            elegir(e.dataTransfer.files[0]);
          }}
          // El campo real es sr-only: el foco se dibuja en la zona, y solo
          // mientras está (no está en creativos; su regla es que se vea).
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2",
            "rounded-panel border border-dashed px-4 py-10 transition-colors duration-150",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember",
            encima
              ? dark
                ? "border-ember bg-ember/[.08] text-stage-ink"
                : "border-ember bg-ember/[.06] text-ember-deep"
              : dark
                ? "border-white/20 text-stage-3 hover:border-white/40 hover:bg-white/[.05] hover:text-stage-ink"
                : "border-rule-strong text-ink-3 hover:border-ink-4 hover:bg-paper-sunken/50 hover:text-ink",
          )}
        >
          <FileUp className="h-6 w-6" strokeWidth={1.6} aria-hidden />
          <span className="text-base">{invitacion}</span>
          <span className={cn("text-meta", dark ? "text-stage-3/70" : "text-ink-4")}>
            {descripcion}
          </span>
        </label>
      )}
    </div>
  );
}
