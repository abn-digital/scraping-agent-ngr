import { Search, X } from "lucide-react";
import { Input } from "./Field";
import { cn } from "@/lib/cn";

// La búsqueda de una lista. El filtro lo hace el back sobre el total, no el
// front sobre la página ya recortada: quien usa esto le pasa el valor
// diferido (useDiferido) a la consulta y el valor crudo acá.
export function CampoBusqueda({
  value,
  onChange,
  placeholder,
  ariaLabel,
  buscando = false,
  anuncio,
  size = "lg",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ariaLabel: string;
  /** Mientras la consulta viaja: un punto que late en lugar de la cruz. */
  buscando?: boolean;
  /** Lo que escucha un lector de pantalla cuando llega el resultado ("12 notas"). */
  anuncio?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full",
        size === "lg" ? "md:max-w-[420px]" : "md:max-w-[360px]",
        className,
      )}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("w-full pl-10 pr-10", size === "lg" ? "h-11 text-lede" : "h-9")}
      />
      {buscando ? (
        <span
          aria-hidden
          className="absolute right-4 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse-dot rounded-full bg-ember"
        />
      ) : (
        value !== "" && (
          <button
            onClick={() => onChange("")}
            aria-label="Limpiar la búsqueda"
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center
              rounded-control text-ink-4 transition-colors duration-150 hover:bg-paper-sunken hover:text-ink"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        )
      )}
      {anuncio !== undefined && (
        <span aria-live="polite" className="sr-only">
          {buscando ? "Buscando" : anuncio}
        </span>
      )}
    </div>
  );
}
