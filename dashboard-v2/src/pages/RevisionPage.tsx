import { motion, useReducedMotion } from "motion/react";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Segmented } from "@/components/ui/Segmented";
import { useParametros } from "@/hooks/useParametros";
import { useComparaciones, useMarcas } from "@/lib/consultas";
import { numero } from "@/lib/datos";
import { plural } from "@/lib/plural";
import { conDatos, pendientes } from "@/lib/precios";
import { CANALES, NOMBRE_DE_CANAL, esCanal } from "@/lib/tiendas";
import type { Canal, Comparacion } from "@/lib/tipos";

// Todo lo que falta decidir, de todas las marcas y canales: los cruces que la IA
// no pudo dar por buenos (puntaje bajo). Cada fila abre la revisión de esa marca
// en ese canal, filtrada a lo pendiente.

interface Cola {
  marca: { key: string; label: string };
  canal: Canal;
  comparacion: Comparacion;
  pendientes: number;
  sinEquivalente: number;
}

export default function RevisionPage() {
  const [params, poner] = useParametros();
  const crudo = params.get("canal");
  const canal = esCanal(crudo) ? crudo : null;

  const marcas = useMarcas();
  const pares = (marcas.data ?? []).flatMap((m) =>
    m.channels
      .filter((c) => c.hasMatches && (!canal || c.channel === canal))
      .map((c) => ({ marca: m, canal: c.channel })),
  );
  const consultas = useComparaciones(pares.map((p) => ({ marca: p.marca.key, canal: p.canal })));
  const cargando = marcas.isLoading || consultas.some((q) => q.isLoading);
  const fallidas = consultas.filter((q) => q.isError);

  const colas: Cola[] = pares
    .flatMap((p, i) => {
      const c = consultas[i]?.data;
      if (!c) return [];
      const ids = conDatos(c.competitors).map((x) => x.id);
      const sin = c.rows.reduce(
        (acc, f) => acc + ids.filter((id) => !f.matches[id]?.best).length,
        0,
      );
      return [
        {
          marca: { key: p.marca.key, label: p.marca.label },
          canal: p.canal,
          comparacion: c,
          pendientes: pendientes(c),
          sinEquivalente: sin,
        },
      ];
    })
    .sort((a, b) => b.pendientes - a.pendientes);
  const conPendientes = colas.filter((c) => c.pendientes > 0);
  const alDia = colas.filter((c) => c.pendientes === 0);
  const total = conPendientes.reduce((s, c) => s + c.pendientes, 0);

  return (
    <>
      <PageHeader
        eyebrow="Cruces de productos"
        title="Revisión"
        lede="Los cruces que la IA no pudo dar por buenos. Hasta que alguien los revise, no entran en los promedios."
        meta={
          <>
            <Metric label="A revisar" value={cargando ? "…" : numero(total)} />
            <Metric label="Comparativas" value={cargando ? "…" : colas.length} />
          </>
        }
      />

      <Contenedor className="pt-10 md:pt-14" aria-label="Filtros">
        <Segmented
          ariaLabel="Canal"
          value={canal ?? "todos"}
          onChange={(v) => poner({ canal: v === "todos" ? null : v })}
          options={[{ value: "todos", label: "Todos los canales" }, ...CANALES]}
          className="w-fit"
        />
      </Contenedor>

      <Contenedor className="pt-6">
        {marcas.isError ? (
          <ErrorEnLinea
            error={marcas.error}
            onRetry={() => void marcas.refetch()}
            recurso="la lista de marcas"
          />
        ) : cargando ? (
          <ul aria-hidden className="space-y-1">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 md:px-5 md:py-5">
                <div className="flex-1 space-y-2">
                  <Esqueleto className="h-6 w-40" />
                  <Esqueleto className="h-4 w-64" />
                </div>
                <Esqueleto className="h-[22px] w-24" />
              </li>
            ))}
            <span role="status" className="sr-only">
              Cargando la revisión
            </span>
          </ul>
        ) : colas.length === 0 && fallidas.length > 0 ? (
          <ErrorEnLinea
            error={fallidas[0]!.error}
            onRetry={() => fallidas.forEach((q) => void q.refetch())}
            recurso="las comparativas"
          />
        ) : colas.length === 0 ? (
          <EstadoVacio
            icon={ClipboardCheck}
            titulo={
              canal ? `Ningún cruce todavía en ${NOMBRE_DE_CANAL[canal]}` : "Ningún cruce todavía"
            }
            bajada="El cruce de productos corre una vez por día, a las 20:00 de Lima."
          />
        ) : (
          <div className="space-y-10">
            {fallidas.length > 0 && (
              <ErrorEnLinea
                error={fallidas[0]!.error}
                onRetry={() => fallidas.forEach((q) => void q.refetch())}
                recurso={plural(fallidas.length, "comparativa")}
              />
            )}
            {conPendientes.length > 0 ? (
              <Lista titulo="Con cruces a revisar" colas={conPendientes} />
            ) : (
              <p className="text-base text-ink-2">
                Nada pendiente: todos los cruces están revisados.
              </p>
            )}
            {alDia.length > 0 && (
              <Lista titulo="Al día" colas={alDia} desde={conPendientes.length} />
            )}
          </div>
        )}
      </Contenedor>
      <div className="h-16" />
    </>
  );
}

function Lista({ titulo, colas, desde = 0 }: { titulo: string; colas: Cola[]; desde?: number }) {
  const quieto = useReducedMotion() ?? false;
  return (
    <section aria-label={titulo}>
      <h2 className="mb-3 font-display text-h3 font-semibold text-ink">{titulo}</h2>
      <ul className="space-y-1">
        {colas.map((c, i) => {
          const q = new URLSearchParams();
          if (c.canal !== "rappi") q.set("canal", c.canal);
          if (c.pendientes > 0) q.set("pendientes", "1");
          const nombres = conDatos(c.comparacion.competitors)
            .map((x) => x.name)
            .join(", ");
          return (
            <motion.li
              key={`${c.marca.key}|${c.canal}`}
              initial={quieto ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                ease: [0.16, 1, 0.3, 1],
                delay: Math.min((i + desde) * 0.035, 0.21),
              }}
              className="group relative flex items-center gap-4 rounded-panel px-4 py-4 transition-[background-color,box-shadow,translate] duration-200 ease-out
                has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-ember hover:-translate-y-0.5 hover:bg-paper-raised hover:shadow-card md:px-5 md:py-5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/marcas/${c.marca.key}/revision${q.size ? `?${q}` : ""}`}
                  className="font-display text-h3 font-semibold text-ink outline-hidden after:absolute after:inset-0"
                >
                  {c.marca.label}
                  <span className="block font-sans text-base font-normal text-ink-3 sm:inline">
                    <span className="hidden sm:inline"> · </span>
                    {NOMBRE_DE_CANAL[c.canal]}
                  </span>
                </Link>
                <p className="mt-0.5 truncate text-meta text-ink-3">
                  {c.canal === "cross" ? "Contra " : "vs "}
                  {nombres} · {plural(c.comparacion.rows.length, "producto")} ·{" "}
                  {plural(c.sinEquivalente, "sin equivalente", "sin equivalente")}
                </p>
              </div>
              {c.pendientes > 0 ? (
                <Chip tone="warn">
                  <span className="tnum">{c.pendientes}</span> a revisar
                </Chip>
              ) : (
                <Chip tone="pass">Al día</Chip>
              )}
              <ChevronRight
                className="h-4 w-4 shrink-0 text-ink-4"
                strokeWidth={1.75}
                aria-hidden
              />
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
