import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { Delta } from "@/components/datos/Delta";
import { Lineas } from "@/components/datos/Lineas";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { fechaDeDia } from "@/lib/lima";
import {
  ESTADO,
  categoriaDe,
  conDatos,
  estadoVisible,
  modoDe,
  posicionDeProducto,
  tonoDe,
  variacionDe,
  soles,
} from "@/lib/precios";
import type { Canal, Comparacion, FilaDeCruce, Marca } from "@/lib/tipos";

/**
 * Un producto propio contra su equivalente en cada competidor (v1: el tooltip
 * de la tabla, con el nombre y la descripción del producto cruzado). Suma cómo
 * se movieron los dos precios en los cruces diarios guardados.
 */
export function DetalleDeProducto({
  abierto,
  onCerrar,
  fila,
  comparacion: c,
  marca,
  canal,
  propio,
  colores,
  dias,
  snaps,
}: {
  abierto: boolean;
  onCerrar: () => void;
  fila: FilaDeCruce | undefined;
  comparacion: Comparacion;
  marca: Marca;
  canal: Canal;
  propio: string;
  colores: Map<string, string>;
  dias: string[];
  snaps: (Comparacion | null)[];
}) {
  const modo = modoDe(c);
  const competidores = conDatos(c.competitors);
  const nombre = fila?.ngr.name ?? "";

  // El mismo producto en cada cruce guardado: su precio y el de su equivalente.
  const enCadaDia = snaps.map((s) => s?.rows.find((f) => f.ngr.name === nombre) ?? null);
  const conDato = enCadaDia.filter(Boolean).length;
  const hrefRevision = (competidor: string) => {
    const q = new URLSearchParams();
    if (canal !== "rappi") q.set("canal", canal);
    q.set("elegir", nombre);
    q.set("en", competidor);
    return `/marcas/${marca.key}/revision?${q}`;
  };

  return (
    <Sheet
      open={abierto}
      onOpenChange={(v) => !v && onCerrar()}
      title={nombre || "Producto"}
      description={
        fila
          ? `${categoriaDe(fila.ngr.category)} · ${soles(fila.ngr.price)} en ${propio}`
          : undefined
      }
      width="lg"
    >
      {fila && (
        <div className="space-y-7">
          {fila.ngr.description?.trim() && (
            <p className="max-w-[70ch] text-base leading-relaxed text-ink-2">
              {fila.ngr.description}
            </p>
          )}

          <section aria-label="Equivalentes">
            <h3 className="label mb-2">
              {modo === "canales"
                ? "El mismo producto en cada canal"
                : "Su equivalente en cada competidor"}
            </h3>
            <ul>
              {competidores.map((x) => {
                const celda = fila.matches[x.id];
                const estado = estadoVisible(celda);
                const v = variacionDe(fila.ngr.price, celda?.best?.price);
                const tono =
                  celda?.best && estado !== "pending"
                    ? tonoDe(posicionDeProducto(fila.ngr.price, celda.best.price), modo)
                    : "neutral";
                return (
                  <li
                    key={x.id}
                    className="grid gap-x-6 gap-y-2 border-t border-rule py-4 first:border-t-0 first:pt-1 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-meta text-ink-3">
                        <span className="font-medium text-ink-2">{x.name}</span>
                        <Chip tone={ESTADO[estado].tono}>{ESTADO[estado].etiqueta}</Chip>
                        {celda?.edited && <span>Decisión manual</span>}
                        {typeof celda?.best?.score === "number" && !celda.edited && (
                          <span className="font-mono tnum">Puntaje {celda.best.score}</span>
                        )}
                      </p>
                      {celda?.best ? (
                        <>
                          <p className="mt-1 text-base font-medium text-ink">{celda.best.name}</p>
                          {celda.best.description?.trim() ? (
                            <p className="mt-0.5 line-clamp-3 text-meta leading-relaxed text-ink-3">
                              {celda.best.description}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-meta text-ink-4">Sin descripción</p>
                          )}
                        </>
                      ) : (
                        <p className="mt-1 text-base text-ink-3">Sin equivalente en {x.name}.</p>
                      )}
                      {!c.isHistorical && (
                        <Link
                          to={hrefRevision(x.id)}
                          className="mt-2 inline-flex items-center gap-1 text-meta text-ink-2 underline decoration-rule-strong underline-offset-4 hover:decoration-ember"
                        >
                          Cambiar el equivalente
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </Link>
                      )}
                    </div>
                    {celda?.best && (
                      <div className="flex items-baseline gap-3 sm:flex-col sm:items-end sm:gap-0.5">
                        <span className="font-display text-h3 font-semibold text-ink tnum">
                          {soles(celda.best.price)}
                        </span>
                        <Delta valor={v} tono={tono} className="text-meta" />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-label="Evolución del precio">
            <h3 className="label mb-3">Precio en cada cruce diario</h3>
            {dias.length < 2 || conDato < 2 ? (
              <p className="text-meta text-ink-3">
                Hace falta más de un cruce guardado con este producto para ver cómo se movió.
              </p>
            ) : (
              <Lineas
                titulo={`Precio de ${nombre} y de sus equivalentes`}
                etiquetasX={dias.map(fechaDeDia)}
                formato={(n) => soles(n, Number.isInteger(n) ? 0 : 2)}
                alto={220}
                series={[
                  {
                    id: "propio",
                    etiqueta: propio,
                    // Lo propio va en ember, como la barra destacada: es lo que se mira.
                    color: "var(--color-ember)",
                    valores: enCadaDia.map((f) => f?.ngr.price ?? null),
                  },
                  ...competidores.map((x) => ({
                    id: x.id,
                    etiqueta: x.name,
                    color: colores.get(x.id) ?? "var(--color-dato-1)",
                    valores: enCadaDia.map((f) => f?.matches[x.id]?.best?.price ?? null),
                  })),
                ]}
              />
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}
