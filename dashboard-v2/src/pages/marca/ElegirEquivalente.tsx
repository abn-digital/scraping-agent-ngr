import { useState } from "react";
import { Check } from "lucide-react";
import { ErrorEnLinea } from "@/components/layout/Estados";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Pulso } from "@/components/ui/Pulso";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useCatalogo, type PedidoDeDecision } from "@/lib/consultas";
import { plural } from "@/lib/plural";
import { ESTADO, estadoVisible, soles } from "@/lib/precios";
import type { Competidor, FilaDeCruce, Producto, ProductoCruzado } from "@/lib/tipos";

const plegar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Elegir el equivalente de un producto en un competidor (v1: el desplegable
 * MatchSelect). Confirmar la sugerencia, dejarlo sin equivalente, volver a lo
 * que dijo la IA o elegir otro producto del catálogo del competidor.
 */
export function ElegirEquivalente({
  abierto,
  onCerrar,
  fila,
  competidor,
  guardando,
  onDecidir,
}: {
  abierto: boolean;
  onCerrar: () => void;
  fila: FilaDeCruce | undefined;
  competidor: Competidor | undefined;
  guardando: boolean;
  onDecidir: (d: PedidoDeDecision, texto: string) => void;
}) {
  const [q, setQ] = useState("");
  const catalogo = useCatalogo(abierto ? competidor?.id : undefined);
  const celda = fila && competidor ? fila.matches[competidor.id] : undefined;
  const estado = estadoVisible(celda);
  const actual = celda?.best ?? null;
  const nombre = fila?.ngr.name ?? "";
  const otro = competidor?.name ?? "";

  const base = { ngrName: nombre, competitorId: competidor?.id ?? "" };
  const aguja = plegar(q.trim());
  const productos = (catalogo.data ?? []).filter(
    (p) =>
      !aguja ||
      plegar(p.name).includes(aguja) ||
      plegar(p.category ?? "").includes(aguja) ||
      plegar(p.description ?? "").includes(aguja),
  );
  const alternativas = (celda?.alternatives ?? []).filter((a) => a.name !== actual?.name);

  const reasignar = (p: Producto | ProductoCruzado) =>
    onDecidir(
      { ...base, action: "reassign", product: p },
      `"${nombre}" ahora se compara con "${p.name}"`,
    );

  return (
    <Sheet
      open={abierto}
      onOpenChange={(v) => {
        if (!v) {
          setQ("");
          onCerrar();
        }
      }}
      title={`Equivalente en ${otro}`}
      description={fila ? `Para ${nombre}, ${soles(fila.ngr.price)}.` : undefined}
      width="md"
    >
      {fila && competidor && (
        <div className="space-y-6">
          <section aria-label="El equivalente de ahora">
            <p className="label mb-2">Ahora</p>
            <div className="rounded-panel bg-paper-sunken/60 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-base leading-snug",
                      actual ? "font-medium text-ink" : "text-ink-3",
                    )}
                  >
                    {actual ? actual.name : "Sin equivalente"}
                  </p>
                  {actual?.description?.trim() && (
                    <p className="mt-0.5 line-clamp-2 text-meta text-ink-3">{actual.description}</p>
                  )}
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-meta text-ink-3">
                    <Chip tone={ESTADO[estado].tono}>{ESTADO[estado].etiqueta}</Chip>
                    {celda?.edited && <span>Decisión manual</span>}
                    {typeof actual?.score === "number" && !celda?.edited && (
                      <span className="font-mono tnum">Puntaje {actual.score}</span>
                    )}
                  </p>
                </div>
                {actual && (
                  <span className="shrink-0 text-base font-medium text-ink tnum">
                    {soles(actual.price)}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {actual && celda?.status === "pending" && (
                <Button
                  size="sm"
                  disabled={guardando}
                  onClick={() =>
                    onDecidir(
                      { ...base, action: "confirm" },
                      `Se confirmó "${actual.name}" para "${nombre}"`,
                    )
                  }
                >
                  Confirmar la sugerencia
                </Button>
              )}
              <Button
                size="sm"
                disabled={guardando || (estado === "rejected" && !!celda?.edited)}
                onClick={() =>
                  onDecidir(
                    { ...base, action: "reject" },
                    `"${nombre}" quedó sin equivalente en ${otro}`,
                  )
                }
              >
                Sin equivalente
              </Button>
              {celda?.edited && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={guardando}
                  onClick={() =>
                    onDecidir({ ...base, action: "reset" }, "Se volvió a la sugerencia de la IA")
                  }
                >
                  Volver a la sugerencia de la IA
                </Button>
              )}
              {guardando && <Pulso estado="en-curso">Guardando…</Pulso>}
            </div>
          </section>

          {alternativas.length > 0 && !aguja && (
            <section aria-label="Otras sugerencias de la IA">
              <p className="label mb-2">Otras sugerencias de la IA</p>
              <ul className="space-y-1">
                {alternativas.map((p) => (
                  <li key={p.name}>
                    <Opcion
                      producto={p}
                      puntaje={p.score}
                      onElegir={() => reasignar(p)}
                      deshabilitada={guardando}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label={`El catálogo de ${otro}`}>
            <p className="label mb-2">Elegir otro del catálogo de {otro}</p>
            <CampoBusqueda
              size="md"
              value={q}
              onChange={setQ}
              placeholder={`Buscar en ${otro}`}
              ariaLabel={`Buscar en el catálogo de ${otro}`}
              anuncio={catalogo.data ? plural(productos.length, "producto") : undefined}
              className="md:max-w-none"
            />
            <div className="mt-3">
              {catalogo.isError ? (
                <ErrorEnLinea
                  error={catalogo.error}
                  onRetry={() => void catalogo.refetch()}
                  recurso="el catálogo"
                />
              ) : catalogo.isLoading ? (
                <div aria-hidden className="space-y-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Esqueleto key={i} className="h-14 w-full" />
                  ))}
                  <span role="status" className="sr-only">
                    Cargando el catálogo
                  </span>
                </div>
              ) : productos.length === 0 ? (
                <p className="py-6 text-center text-meta text-ink-3">
                  {aguja
                    ? `No se encontraron productos con "${q.trim()}".`
                    : "El catálogo está vacío."}
                </p>
              ) : (
                <ul className="space-y-1">
                  {productos.map((p, i) => (
                    <li key={`${p.name}#${i}`}>
                      <Opcion
                        producto={p}
                        elegida={actual?.name === p.name}
                        onElegir={() => reasignar(p)}
                        deshabilitada={guardando || actual?.name === p.name}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </Sheet>
  );
}

function Opcion({
  producto: p,
  puntaje,
  elegida = false,
  deshabilitada,
  onElegir,
}: {
  producto: Producto | ProductoCruzado;
  puntaje?: number;
  elegida?: boolean;
  deshabilitada: boolean;
  onElegir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onElegir}
      disabled={deshabilitada}
      aria-current={elegida || undefined}
      className={cn(
        "flex w-full items-start gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-150",
        "enabled:hover:bg-paper-sunken disabled:cursor-default",
        elegida && "bg-paper-sunken",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className={cn("block text-base leading-snug text-ink", elegida && "font-medium")}>
          {p.name}
        </span>
        <span className="mt-0.5 line-clamp-2 text-meta text-ink-3">
          {[p.category, p.description?.trim()].filter(Boolean).join(" · ") || "Sin descripción"}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-base font-medium text-ink tnum">{soles(p.price)}</span>
        {typeof puntaje === "number" && (
          <span className="font-mono text-micro text-ink-4 tnum">{puntaje}</span>
        )}
      </span>
      {elegida && (
        <Check className="mt-1 h-4 w-4 shrink-0 text-ember" strokeWidth={2.4} aria-hidden />
      )}
    </button>
  );
}
