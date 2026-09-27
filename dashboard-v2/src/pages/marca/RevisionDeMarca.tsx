import { CircleCheck, Pencil, SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Panel } from "@/components/ui/Panel";
import { Switch } from "@/components/ui/Switch";
import { useParametros } from "@/hooks/useParametros";
import { nombrePropio } from "@/lib/analisis";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/cn";
import { useDecision, type PedidoDeDecision } from "@/lib/consultas";
import { plural } from "@/lib/plural";
import { ESTADO, categoriaDe, conDatos, estadoVisible, pendientes, soles } from "@/lib/precios";
import type { Canal, Celda, Comparacion, Competidor, FilaDeCruce, Marca } from "@/lib/tipos";
import { ElegirEquivalente } from "./ElegirEquivalente";
import { coincide } from "./filtros";

// La revisión de los cruces (v1: "Revisión manual"). Cada producto propio con
// su equivalente en cada competidor; tocar uno abre la hoja para confirmarlo,
// cambiarlo o dejarlo sin equivalente. Lo que decide una persona siempre le
// gana a la IA, también cuando el cruce se vuelve a calcular.

// Las columnas por cantidad de competidores, escritas enteras para que
// Tailwind las encuentre.
const COLUMNAS: Record<number, string> = {
  1: "lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]",
  2: "lg:grid-cols-[minmax(0,17rem)_repeat(2,minmax(0,1fr))]",
  3: "lg:grid-cols-[minmax(0,17rem)_repeat(3,minmax(0,1fr))]",
  4: "lg:grid-cols-[minmax(0,15rem)_repeat(4,minmax(0,1fr))]",
};

/** Lo que deja todo como estaba antes de una decisión. */
function inversa(d: PedidoDeDecision, antes: Celda | undefined): PedidoDeDecision {
  const base = { ngrName: d.ngrName, competitorId: d.competitorId };
  if (!antes?.edited) return { ...base, action: "reset" };
  if (antes.status === "rejected" || !antes.best) return { ...base, action: "reject" };
  return { ...base, action: "reassign", product: antes.best };
}

export function RevisionDeMarca({
  comparacion: c,
  marca,
  canal,
  soloLectura,
}: {
  comparacion: Comparacion;
  marca: Marca;
  canal: Canal;
  soloLectura: boolean;
}) {
  const [params, poner] = useParametros();
  const q = params.get("q") ?? "";
  const soloPendientes = params.get("pendientes") === "1";
  const elegir = params.get("elegir");
  const en = params.get("en");

  const competidores = conDatos(c.competitors);
  const propio = nombrePropio(c, marca.label);
  const filas = c.rows
    .map((f, i) => ({ ...f, i }))
    .filter((f) => coincide(f, q))
    .filter((f) => !soloPendientes || Object.values(f.matches).some((m) => m.status === "pending"));
  const total = pendientes(c);

  const decision = useDecision(marca.key, canal);
  const abierta =
    !soloLectura && elegir && en ? c.rows.find((f) => f.ngr.name === elegir) : undefined;
  const competidorAbierto = competidores.find((x) => x.id === en);

  const decidir = (d: PedidoDeDecision, texto: string) => {
    const antes = c.rows.find((f) => f.ngr.name === d.ngrName)?.matches[d.competitorId];
    decision.mutate(d, {
      onSuccess: () => {
        poner({ elegir: null, en: null });
        aviso.ok(texto, {
          action: {
            label: "Deshacer",
            onClick: () =>
              decision.mutate(inversa(d, antes), {
                onSuccess: () => aviso.ok("Se deshizo el cambio"),
              }),
          },
        });
      },
    });
  };

  const abrir = (f: FilaDeCruce, x: Competidor) => poner({ elegir: f.ngr.name, en: x.id });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <CampoBusqueda
          size="md"
          value={q}
          onChange={(v) => poner({ q: v })}
          placeholder="Buscar un producto o una categoría"
          ariaLabel="Buscar en la revisión"
          anuncio={plural(filas.length, "producto")}
        />
        <label className="flex items-center gap-2.5 text-base text-ink-2">
          <Switch
            checked={soloPendientes}
            onChange={(v) => poner({ pendientes: v ? "1" : null })}
            label="Solo los que faltan revisar"
          />
          Solo pendientes
          <span className="text-meta text-ink-4 tnum">{total}</span>
        </label>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="max-w-[70ch] text-base text-ink-2">
          {soloLectura
            ? "Vista de un cruce guardado: solo lectura."
            : `Elegí el equivalente de cada producto de ${propio} en cada ${
                c.mode === "cross" ? "canal" : "competidor"
              }. Se guarda al elegir.`}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-3">
          <Chip tone="warn">A revisar</Chip>
          <span>
            La IA no está segura (puntaje menor a {c.reviewThreshold}): no entra en los promedios.
          </span>
        </p>
      </div>

      {filas.length === 0 ? (
        <Panel>
          {soloPendientes && !q.trim() ? (
            <EstadoVacio
              icon={CircleCheck}
              titulo="Ningún cruce pendiente"
              bajada="La IA dio por buenos todos los cruces o ya los revisó alguien."
              acciones={
                <Button onClick={() => poner({ pendientes: null })}>Ver todos los productos</Button>
              }
            />
          ) : (
            <EstadoVacio
              icon={SearchX}
              titulo="No se encontraron productos con"
              consulta={q.trim()}
              acciones={<Button onClick={() => poner({ q: null })}>Limpiar la búsqueda</Button>}
            />
          )}
        </Panel>
      ) : (
        <Panel plano>
          <div
            aria-hidden
            className={cn(
              "hidden gap-3 border-b border-rule px-5 py-2.5 text-meta font-medium text-ink-3 lg:grid",
              COLUMNAS[competidores.length],
            )}
          >
            <span>Producto de {propio}</span>
            {competidores.map((x) => (
              <span key={x.id} className="truncate">
                {x.name}
              </span>
            ))}
          </div>
          <ul aria-label={`Cruces de ${propio}`}>
            {filas.map((f) => (
              <li
                key={`${f.ngr.name}#${f.i}`}
                className={cn(
                  "grid gap-3 border-b border-rule/70 px-4 py-4 last:border-b-0 sm:grid-cols-2 md:px-5",
                  COLUMNAS[competidores.length],
                )}
              >
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <p className="text-base font-medium leading-snug text-ink">{f.ngr.name}</p>
                  <p className="mt-0.5 text-meta text-ink-3">
                    {categoriaDe(f.ngr.category)} ·{" "}
                    <span className="tnum text-ink-2">{soles(f.ngr.price)}</span>
                  </p>
                  {f.ngr.description?.trim() && (
                    <p className="mt-1 line-clamp-2 text-meta leading-relaxed text-ink-3">
                      {f.ngr.description}
                    </p>
                  )}
                </div>
                {competidores.map((x) => (
                  <CeldaDeCruce
                    key={x.id}
                    competidor={x}
                    celda={f.matches[x.id]}
                    soloLectura={soloLectura}
                    onAbrir={() => abrir(f, x)}
                    guardando={
                      decision.isPending &&
                      decision.variables?.ngrName === f.ngr.name &&
                      decision.variables?.competitorId === x.id
                    }
                  />
                ))}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ElegirEquivalente
        abierto={!!abierta && !!competidorAbierto}
        onCerrar={() => poner({ elegir: null, en: null })}
        fila={abierta}
        competidor={competidorAbierto}
        guardando={decision.isPending}
        onDecidir={decidir}
      />
    </div>
  );
}

function CeldaDeCruce({
  competidor,
  celda,
  soloLectura,
  onAbrir,
  guardando,
}: {
  competidor: Competidor;
  celda: Celda | undefined;
  soloLectura: boolean;
  onAbrir: () => void;
  guardando: boolean;
}) {
  const estado = estadoVisible(celda);
  const best = celda?.best;
  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={soloLectura || guardando}
      aria-label={`${competidor.name}: ${best ? best.name : "sin equivalente"}, ${ESTADO[estado].etiqueta}${
        soloLectura ? "" : ". Cambiar"
      }`}
      className={cn(
        "flex min-h-[4.5rem] w-full min-w-0 flex-col items-start rounded-control border px-3 py-2.5 text-left",
        "transition-[border-color,background-color,opacity] duration-150 disabled:cursor-default",
        guardando && "opacity-60",
        estado === "pending"
          ? "border-warn-rule bg-warn-wash/70 enabled:hover:border-warn"
          : !best
            ? "border-dashed border-rule-strong enabled:hover:border-ink-4 enabled:hover:bg-paper-raised"
            : "border-rule bg-paper-raised enabled:hover:border-rule-strong enabled:hover:bg-white",
      )}
    >
      <span className="text-micro text-ink-3 lg:hidden">{competidor.name}</span>
      <span
        className={cn(
          "line-clamp-2 text-base leading-snug",
          best ? "font-medium text-ink" : "text-ink-3",
        )}
      >
        {best ? best.name : "Sin equivalente"}
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-1.5 text-meta">
        {best && <span className="font-medium text-ink tnum">{soles(best.price)}</span>}
        {(best || guardando) && (
          <Chip tone={ESTADO[estado].tono}>
            {guardando ? "Guardando…" : ESTADO[estado].etiqueta}
          </Chip>
        )}
        {!best && !guardando && !soloLectura && <span className="text-ink-4">Elegir uno</span>}
        {celda?.edited && (
          <span className="inline-flex items-center gap-1 text-ink-3">
            <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
            manual
          </span>
        )}
        {typeof best?.score === "number" && !celda?.edited && (
          <span className="font-mono text-micro text-ink-4 tnum">{best.score}</span>
        )}
      </span>
      {best?.description?.trim() && (
        <span className="mt-1 line-clamp-2 text-meta leading-relaxed text-ink-3">
          {best.description}
        </span>
      )}
    </button>
  );
}

export function EsqueletoDeRevision() {
  return (
    <div className="space-y-6">
      <span role="status" className="sr-only">
        Cargando la revisión
      </span>
      <div aria-hidden className="flex flex-col gap-3 md:flex-row md:items-center">
        <Esqueleto className="h-9 w-full md:w-[360px]" />
        <Esqueleto className="h-6 w-40" />
      </div>
      <Esqueleto className="h-5 w-full max-w-[60ch]" />
      <Panel plano>
        <ul aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <li
              key={i}
              className="grid gap-3 border-b border-rule/70 px-4 py-4 sm:grid-cols-2 md:px-5 lg:grid-cols-[minmax(0,17rem)_repeat(2,minmax(0,1fr))]"
            >
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Esqueleto className="h-5 w-44" />
                <Esqueleto className="h-4 w-32" />
              </div>
              <Esqueleto className="h-[4.5rem] w-full" />
              <Esqueleto className="h-[4.5rem] w-full" />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
