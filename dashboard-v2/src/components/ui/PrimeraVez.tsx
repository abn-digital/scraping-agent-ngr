import { ArrowDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { Halos } from "./Halos";

// La primera vez que alguien entra a una sección vacía: en el escenario, con
// una ilustración de lo que va a lograr y los caminos para empezar. No es un
// estado vacío con otro nombre: vende lo que la sección hace.
export function PrimeraVez({
  etiqueta,
  titulo,
  bajada,
  ilustracion,
  tituloLista,
  items,
  onEmpezar,
  empezarLabel = "Empezar",
}: {
  etiqueta: string;
  titulo: string;
  bajada: ReactNode;
  ilustracion?: ReactNode;
  tituloLista?: string;
  items?: { icon: LucideIcon; title: string; what: string }[];
  onEmpezar: () => void;
  empezarLabel?: string;
}) {
  return (
    <section className="stage-grid relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center overflow-hidden bg-stage py-16 md:min-h-dvh md:py-20">
      <Halos />
      <div className="relative mx-auto w-full max-w-[1320px] px-5 md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-14">
          <div className="min-w-0">
            <p className="label text-stage-3">{etiqueta}</p>
            <h2 className="mt-3 font-display text-h1 font-semibold leading-[1.06] tracking-[-.03em] text-stage-ink">
              {titulo}
            </h2>
            <p className="mt-4 max-w-[52ch] text-lede leading-relaxed text-stage-3">{bajada}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button tone="dark" variant="primary" size="lg" onClick={onEmpezar}>
                {empezarLabel}
                <ArrowDown className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </div>

          {ilustracion}
        </div>

        {items && items.length > 0 && (
          <div className="mt-12 border-t border-stage-rule pt-7 md:mt-16">
            {tituloLista && <p className="label mb-4 text-stage-3">{tituloLista}</p>}
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((c) => (
                <li key={c.title} className="flex items-center gap-3">
                  <c.icon
                    className="h-[22px] w-[22px] shrink-0 text-ember"
                    strokeWidth={1.6}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="block text-base text-stage-ink">{c.title}</span>
                    <span className="mt-0.5 block text-meta leading-snug text-stage-3">
                      {c.what}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
