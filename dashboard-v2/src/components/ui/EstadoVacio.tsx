import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// "Ningún X todavía" o "No se encontraron X con "q"". La consulta va en
// semibold y el resto en peso normal: lo que se buscó es lo que se lee.
export function EstadoVacio({
  icon: Icon,
  titulo,
  consulta,
  bajada,
  acciones,
}: {
  icon: LucideIcon;
  titulo: ReactNode;
  consulta?: string;
  bajada?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="py-20 text-center">
      <Icon className="mx-auto h-6 w-6 text-ink-4" strokeWidth={1.6} aria-hidden />
      <p className="mt-4 font-display text-h3 text-ink">
        {consulta ? (
          <>
            {titulo} <span className="font-semibold">"{consulta}"</span>
          </>
        ) : (
          <span className="font-semibold">{titulo}</span>
        )}
      </p>
      {bajada && <p className="mx-auto mt-2 max-w-[48ch] text-base text-ink-3">{bajada}</p>}
      {acciones && <div className="mt-5 flex justify-center gap-2">{acciones}</div>}
    </div>
  );
}
