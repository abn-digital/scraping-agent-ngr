import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, SearchX } from "lucide-react";
import { Link } from "react-router";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Segmented } from "@/components/ui/Segmented";
import { useParametros } from "@/hooks/useParametros";
import { useResultados } from "@/lib/consultas";
import { numero } from "@/lib/datos";
import { antiguedad, diasDesde, fechaHoraLima, fechaLima } from "@/lib/lima";
import { plural } from "@/lib/plural";
import { MARCAS_NGR, PLATAFORMA_DE_CANAL, TIENDAS, type TiendaConocida } from "@/lib/tiendas";
import type { Tienda } from "@/lib/tipos";

// Los catálogos de donde salen los precios (v1: pestañas "Agregadores" y
// "Locales propios"). Agrupados por marca de NGR: la propia primero y su
// competencia después, como el selector de la v1.

type CanalDeTienda = "rappi" | "peya" | "propio";
const OPCIONES: { value: CanalDeTienda; label: string }[] = [
  { value: "rappi", label: "Rappi" },
  { value: "peya", label: "PedidosYa" },
  { value: "propio", label: "Sitios propios" },
];
const VIEJO = 14;

const plegar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function TiendasPage() {
  const [params, poner] = useParametros();
  const crudo = params.get("canal");
  const canal: CanalDeTienda = crudo === "peya" || crudo === "propio" ? crudo : "rappi";
  const q = params.get("q") ?? "";
  const resultados = useResultados();
  const porId = new Map((resultados.data ?? []).map((t) => [t.id, t]));

  const plataforma = PLATAFORMA_DE_CANAL[canal];
  const delCanal = TIENDAS.filter((t) => t.plataforma === plataforma);
  const aguja = plegar(q.trim());
  const visibles = delCanal.filter((t) => {
    if (!aguja) return true;
    const local = porId.get(t.id)?.local ?? "";
    return plegar(t.nombre).includes(aguja) || plegar(local).includes(aguja);
  });
  const grupos = MARCAS_NGR.map((m) => ({
    marca: m,
    tiendas: visibles.filter((t) => t.marca === m.key),
  })).filter((g) => g.tiendas.length > 0);

  const conDatos = delCanal.map((t) => porId.get(t.id)).filter((t): t is Tienda => !!t);
  const productos = conDatos.reduce((s, t) => s + t.products.length, 0);
  const ultima = conDatos
    .map((t) => t.lastUpdated)
    .filter((x): x is string => !!x)
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        eyebrow="Catálogos"
        title="Tiendas"
        lede="Los catálogos que se leen de Rappi, PedidosYa y los sitios propios de cada marca y de su competencia."
        meta={
          <>
            <Metric label="Tiendas" value={delCanal.length} />
            <Metric
              label="Productos"
              value={resultados.isLoading ? "…" : resultados.isError ? "—" : numero(productos)}
            />
            <Metric label="Última extracción" value={ultima ? fechaHoraLima(ultima) : "—"} />
          </>
        }
      />

      <Contenedor className="pt-10 md:pt-14" aria-label="Filtros">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CampoBusqueda
            value={q}
            onChange={(v) => poner({ q: v })}
            placeholder="Buscar una tienda o un local"
            ariaLabel="Buscar tiendas"
            anuncio={plural(visibles.length, "tienda")}
          />
          <Segmented
            ariaLabel="Canal"
            value={canal}
            onChange={(v) => poner({ canal: v === "rappi" ? null : v })}
            options={OPCIONES.map((o) => ({
              ...o,
              count: TIENDAS.filter((t) => t.plataforma === PLATAFORMA_DE_CANAL[o.value]).length,
            }))}
            className="w-fit"
          />
        </div>
      </Contenedor>

      <Contenedor className="pt-6">
        {resultados.isError && (
          <div className="mb-6">
            <ErrorEnLinea
              error={resultados.error}
              onRetry={() => void resultados.refetch()}
              recurso="los catálogos"
            />
          </div>
        )}
        {resultados.isLoading ? (
          <EsqueletoDeTiendas />
        ) : grupos.length === 0 ? (
          <EstadoVacio
            icon={SearchX}
            titulo="No se encontraron tiendas con"
            consulta={q.trim()}
            acciones={<Button onClick={() => poner({ q: null })}>Limpiar la búsqueda</Button>}
          />
        ) : (
          <div className="space-y-10">
            {grupos.map((g, gi) => (
              <section key={g.marca.key} aria-label={g.marca.label}>
                <div className="mb-2 flex items-baseline justify-between gap-4 px-4 md:px-5">
                  <h2 className="font-display text-h3 font-semibold text-ink">{g.marca.label}</h2>
                  <Link
                    to={`/marcas/${g.marca.key}${canal === "rappi" ? "" : `?canal=${canal}`}`}
                    className="text-meta text-ink-3 underline decoration-rule-strong underline-offset-4 hover:text-ink hover:decoration-ember"
                  >
                    Ver la comparativa
                  </Link>
                </div>
                <ul className="space-y-1">
                  {g.tiendas.map((t, i) => (
                    <FilaDeTienda
                      key={t.id}
                      conocida={t}
                      tienda={porId.get(t.id)}
                      orden={gi * 3 + i}
                      sinDatos={resultados.isError}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Contenedor>
      <div className="h-16" />
    </>
  );
}

function FilaDeTienda({
  conocida,
  tienda,
  orden,
  sinDatos,
}: {
  conocida: TiendaConocida;
  tienda?: Tienda;
  orden: number;
  /** Los catálogos no cargaron: no se sabe si la tienda tiene datos. */
  sinDatos: boolean;
}) {
  const quieto = useReducedMotion() ?? false;
  const dias = diasDesde(tienda?.lastUpdated);
  const marca = MARCAS_NGR.find((m) => m.key === conocida.marca)?.label ?? "";
  return (
    <motion.li
      initial={quieto ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: Math.min(orden * 0.035, 0.21) }}
      className="group relative flex items-center gap-4 rounded-panel px-4 py-4 transition-[background-color,box-shadow,translate] duration-200 ease-out
        has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ember hover:-translate-y-0.5 hover:bg-paper-raised hover:shadow-card md:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            to={`/tiendas/${encodeURIComponent(conocida.id)}`}
            className="text-base font-medium text-ink outline-hidden after:absolute after:inset-0"
          >
            {conocida.nombre}
          </Link>
          {conocida.propia ? (
            <span className="text-meta">
              <Chip tone="muted">Marca NGR</Chip>
            </span>
          ) : (
            <span className="hidden text-meta text-ink-3 sm:inline">Competencia de {marca}</span>
          )}
        </p>
        <p className="mt-0.5 truncate text-meta text-ink-3">
          {tienda ? tienda.local : sinDatos ? "—" : "Sin catálogo todavía"}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-meta text-ink-2 tnum">
          {tienda ? plural(tienda.products.length, "producto") : "—"}
        </p>
        <p className="text-meta text-ink-3">
          {tienda?.lastUpdated ? fechaLima(tienda.lastUpdated) : sinDatos ? "" : "Sin extracción"}
        </p>
      </div>
      <div className="min-w-[6.5rem] shrink-0 whitespace-nowrap text-right text-meta">
        {dias != null && dias > VIEJO ? (
          <Chip tone="warn">{antiguedad(tienda!.lastUpdated!)}</Chip>
        ) : (
          <span className="text-meta text-ink-3 tnum">
            {tienda?.lastUpdated ? antiguedad(tienda.lastUpdated) : ""}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} aria-hidden />
    </motion.li>
  );
}

function EsqueletoDeTiendas() {
  return (
    <div className="space-y-10" aria-hidden>
      <span role="status" className="sr-only">
        Cargando las tiendas
      </span>
      {[3, 3].map((n, g) => (
        <div key={g}>
          <Esqueleto className="mx-4 mb-3 h-6 w-32 md:mx-5" />
          <ul className="space-y-1">
            {Array.from({ length: n }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 md:px-5">
                <div className="flex-1 space-y-2">
                  <Esqueleto className="h-5 w-44" />
                  <Esqueleto className="h-4 w-72 max-w-full" />
                </div>
                <Esqueleto className="hidden h-9 w-24 sm:block" />
                <Esqueleto className="h-4 w-16" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
