import { Lineas } from "@/components/datos/Lineas";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { Sheet } from "@/components/ui/Sheet";
import { useCorridas } from "@/lib/consultas";
import { diaLima, fechaDeDia } from "@/lib/lima";
import { plural } from "@/lib/plural";
import { categoriaDe, soles } from "@/lib/precios";
import type { Corrida, Producto } from "@/lib/tipos";

const clave = (p: Producto) => `${categoriaDe(p.category)}|${p.name}`;
const DIAS = 30;

/**
 * Un producto de una tienda y cómo cambió su precio: la última corrida de cada
 * día, hasta treinta días. Las corridas se piden recién al abrir la hoja, y
 * una corrida guardada no cambia, así que quedan en caché.
 */
export function EvolucionDeProducto({
  abierto,
  onCerrar,
  producto,
  tiendaId,
  corridas,
  enHistorial,
  vigentes,
  liveAt,
}: {
  abierto: boolean;
  onCerrar: () => void;
  producto: (Producto & { clave: string }) | undefined;
  tiendaId: string;
  /** Todas las corridas, de la más nueva a la más vieja. */
  corridas: Corrida[];
  enHistorial: string[];
  vigentes: Producto[];
  liveAt: string | null;
}) {
  // La última corrida de cada día, de la más vieja a la más nueva.
  const porDia = new Map<string, string>();
  for (const r of corridas) {
    const d = diaLima(r.at);
    if (!porDia.has(d)) porDia.set(d, r.at);
  }
  const dias = [...porDia.entries()].slice(0, DIAS).reverse();
  const guardadas = new Set(enHistorial);
  const pedir = abierto ? dias.map(([, at]) => at).filter((at) => guardadas.has(at)) : [];
  const consultas = useCorridas(tiendaId, pedir);
  const porAt = new Map(pedir.map((at, i) => [at, consultas[i]]));
  const cargando = consultas.some((c) => c.isLoading);

  const precios = dias.map(([, at]) => {
    const lista = guardadas.has(at)
      ? porAt.get(at)?.data?.products
      : at === liveAt
        ? vigentes
        : undefined;
    const p = producto ? lista?.find((x) => clave(x) === producto.clave) : undefined;
    return p?.price ?? null;
  });
  const cambios = precios.flatMap((p, i) => {
    const antes = precios
      .slice(0, i)
      .filter((x): x is number => x != null)
      .at(-1);
    return p != null && antes != null && Math.abs(p - antes) > 0.005
      ? [{ dia: dias[i]![0], antes, ahora: p }]
      : [];
  });
  const oferta =
    producto &&
    typeof producto.originalPrice === "number" &&
    producto.originalPrice > producto.price;

  return (
    <Sheet
      open={abierto}
      onOpenChange={(v) => !v && onCerrar()}
      title={producto?.name ?? "Producto"}
      description={
        producto ? `${categoriaDe(producto.category)} · ${soles(producto.price)}` : undefined
      }
      width="lg"
    >
      {producto && (
        <div className="space-y-7">
          <div className="flex flex-wrap items-center gap-2 text-meta text-ink-3">
            {oferta && (
              <>
                <span>
                  Precio de lista{" "}
                  <span className="tnum line-through">{soles(producto.originalPrice)}</span>
                </span>
                {producto.promoPartner && <Chip tone="neutral">{producto.promoPartner}</Chip>}
              </>
            )}
            {producto.inStock === false && <Chip tone="warn">Sin stock</Chip>}
            {producto.sku && <span className="font-mono">SKU {producto.sku}</span>}
          </div>
          {producto.description?.trim() && (
            <p className="max-w-[70ch] text-base leading-relaxed text-ink-2">
              {producto.description}
            </p>
          )}

          <section aria-label="Evolución del precio">
            <h3 className="label mb-3">Precio de la última corrida de cada día</h3>
            {dias.length < 2 ? (
              <p className="text-meta text-ink-3">
                Hace falta más de un día con corridas para ver cómo se movió.
              </p>
            ) : cargando ? (
              <>
                <Esqueleto className="h-[220px] w-full" />
                <span role="status" className="sr-only">
                  Cargando las corridas
                </span>
              </>
            ) : (
              <Lineas
                titulo={`Precio de ${producto.name} por día`}
                etiquetasX={dias.map(([d]) => fechaDeDia(d))}
                formato={(n) => soles(n, Number.isInteger(n) ? 0 : 2)}
                alto={220}
                series={[
                  {
                    id: "precio",
                    etiqueta: "Precio",
                    color: "var(--color-dato-1)",
                    valores: precios,
                  },
                ]}
              />
            )}
          </section>

          {!cargando && dias.length >= 2 && (
            <section aria-label="Cambios de precio">
              <h3 className="label mb-2">Cambios de precio</h3>
              {cambios.length === 0 ? (
                <p className="text-meta text-ink-3">
                  El precio no cambió en {plural(dias.length, "día", "días")} con corridas.
                </p>
              ) : (
                <ul className="divide-y divide-rule">
                  {cambios.reverse().map((c) => (
                    <li
                      key={c.dia}
                      className="flex items-baseline justify-between gap-4 py-2 text-base"
                    >
                      <span className="text-ink-2">{fechaDeDia(c.dia)}</span>
                      <span className="tnum text-ink">
                        <span className="text-ink-3">{soles(c.antes)}</span> → {soles(c.ahora)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}
