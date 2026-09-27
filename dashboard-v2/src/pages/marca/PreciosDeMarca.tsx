import type { ReactNode } from "react";
import { SearchX } from "lucide-react";
import { Cifra } from "@/components/datos/Cifra";
import { Columnas } from "@/components/datos/Columnas";
import { Delta } from "@/components/datos/Delta";
import { Lineas } from "@/components/datos/Lineas";
import { Proporcion } from "@/components/datos/Proporcion";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EsqueletoDeTabla } from "@/components/ui/EsqueletoDeTabla";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { SelectorMultiple } from "@/components/ui/SelectorMultiple";
import { Switch } from "@/components/ui/Switch";
import { Tabla, ordenar, type Columna, type Orden } from "@/components/ui/Tabla";
import { useParametros } from "@/hooks/useParametros";
import { nombrePropio } from "@/lib/analisis";
import { cn } from "@/lib/cn";
import { useComparaciones } from "@/lib/consultas";
import { coloresPorEntidad, colorDeSerie, numero, variacion } from "@/lib/datos";
import { fechaDeDia } from "@/lib/lima";
import { plural } from "@/lib/plural";
import {
  TRAMOS,
  categoriaDe,
  conDatos,
  distribucion,
  fraseDePromedio,
  ejeDeVariacion,
  sujetoDe,
  modoDe,
  posicionDePromedio,
  posicionDeProducto,
  resumir,
  tonoDe,
  variacionDe,
  type Modo,
  soles,
} from "@/lib/precios";
import type { Canal, Comparacion, Competidor, FilaDeCruce, Marca } from "@/lib/tipos";
import { DetalleDeProducto } from "./DetalleDeProducto";
import { categoriasDe, filtrarFilas } from "./filtros";

type FilaIndexada = FilaDeCruce & { i: number };

export function leerOrden(v: string | null): Orden {
  if (!v) return null;
  const [columna, sentido] = v.split(":");
  return columna && (sentido === "asc" || sentido === "desc") ? { columna, sentido } : null;
}

const tonoDeTexto = (t: "pass" | "fail" | "neutral") =>
  t === "pass" ? "text-pass-soft" : t === "fail" ? "text-fail-soft" : "text-stage-ink";

export function PreciosDeMarca({
  comparacion: c,
  marca,
  canal,
  fechas,
}: {
  comparacion: Comparacion;
  marca: Marca;
  canal: Canal;
  fechas: string[];
}) {
  const [params, poner] = useParametros();
  const q = params.get("q") ?? "";
  const competidorId = params.get("competidor");
  const cats = params.getAll("cat");
  const conMatch = params.get("conMatch") === "1";
  const orden = leerOrden(params.get("orden"));
  const producto = params.get("producto");

  const modo = modoDe(c);
  const propio = nombrePropio(c, marca.label);
  const todos = conDatos(c.competitors);
  const colores = coloresPorEntidad(todos.map((x) => x.id));
  const visibles =
    competidorId && todos.some((x) => x.id === competidorId)
      ? todos.filter((x) => x.id === competidorId)
      : todos;
  const categorias = categoriasDe(c.rows);
  const indexadas: FilaIndexada[] = c.rows.map((f, i) => ({ ...f, i }));
  const filas = filtrarFilas(indexadas, { q, categorias: cats }).filter(
    (f) => !conMatch || visibles.some((x) => f.matches[x.id]?.best),
  );
  const hayFiltros = q.trim() !== "" || cats.length > 0 || conMatch;

  // La evolución sale de los cruces guardados por día (hasta los últimos 30).
  const dias = [...fechas].slice(0, 30).reverse();
  const snaps = useComparaciones(dias.map((d) => ({ marca: marca.key, canal, fecha: d })));

  const evolucion = visibles.map((x) => ({
    id: x.id,
    etiqueta: x.name,
    color: colores.get(x.id) ?? colorDeSerie(0),
    valores: snaps.map((s) =>
      s.data ? resumir(filtrarFilas(s.data.rows, { q, categorias: cats }), x.id).promedio : null,
    ),
  }));

  const abierta = producto ? c.rows.find((f) => f.ngr.name === producto) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <CampoBusqueda
          size="md"
          value={q}
          onChange={(v) => poner({ q: v })}
          placeholder="Buscar un producto o una categoría"
          ariaLabel="Buscar en la comparativa"
          anuncio={plural(filas.length, "producto")}
        />
        <div className="grid gap-3 sm:grid-cols-2 md:flex md:items-center">
          <Select
            label={modo === "canales" ? "Canal" : "Competidor"}
            value={competidorId && todos.some((x) => x.id === competidorId) ? competidorId : ""}
            onChange={(v) => poner({ competidor: v || null })}
            options={[
              {
                value: "",
                label: modo === "canales" ? "Todos los canales" : "Todos los competidores",
              },
              ...todos.map((x) => ({ value: x.id, label: x.name })),
            ]}
            className="md:w-56"
          />
          <SelectorMultiple
            valores={cats}
            onChange={(v) => poner({ cat: v })}
            opciones={categorias.map((x) => ({ value: x, label: x }))}
            nombre="categoría"
            nombrePlural="categorías"
            className="md:w-56"
          />
        </div>
        <label className="flex items-center gap-2.5 text-base text-ink-2">
          <Switch
            checked={conMatch}
            onChange={(v) => poner({ conMatch: v ? "1" : null })}
            label="Solo productos con equivalente"
          />
          Solo con equivalente
        </label>
      </div>

      <Panel
        oscuro
        titulo={
          modo === "canales"
            ? `${marca.label}: ${propio.toLowerCase()} contra sus otros canales`
            : `${marca.label} contra su competencia`
        }
        bajada={
          hayFiltros
            ? `Con los filtros de arriba · ${plural(filas.length, "producto")}. Los cruces a revisar no entran.`
            : "Diferencia promedio producto por producto. Los cruces a revisar no entran."
        }
      >
        <div
          className={cn(
            "grid gap-4",
            visibles.length >= 2 && "md:grid-cols-2",
            visibles.length >= 3 && "xl:grid-cols-3",
          )}
        >
          {visibles.map((x) => (
            <BloqueDeCompetidor
              key={x.id}
              competidor={x}
              filas={filas}
              propio={propio}
              modo={modo}
              onVer={() => poner({ competidor: x.id })}
              elegido={visibles.length === 1 && todos.length > 1}
              onTodos={() => poner({ competidor: null })}
            />
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          titulo="Cómo se reparte la diferencia"
          bajada="Cuántos productos caen en cada rango, de más barato a más caro."
        >
          <Columnas
            titulo="Productos por rango de diferencia"
            categorias={TRAMOS.map((t) => t.etiqueta)}
            series={visibles.map((x) => ({
              id: x.id,
              etiqueta: x.name,
              color: colores.get(x.id) ?? colorDeSerie(0),
              valores: distribucion(filas, x.id),
            }))}
          />
        </Panel>
        <Panel titulo="Evolución" bajada="Diferencia promedio en cada cruce diario guardado.">
          {dias.length < 2 ? (
            <div className="grid h-[240px] place-items-center text-center">
              <p className="max-w-[40ch] text-meta text-ink-3">
                {dias.length === 1
                  ? `La evolución se arma con los cruces diarios. Por ahora hay uno solo, del ${fechaDeDia(dias[0]!)}.`
                  : "La evolución se arma con los cruces diarios. Todavía no hay ninguno guardado."}
              </p>
            </div>
          ) : snaps.some((s) => s.isLoading) ? (
            <Esqueleto className="h-[240px] w-full" />
          ) : (
            <Lineas
              {...ejeDeVariacion(evolucion.flatMap((e) => e.valores))}
              titulo="Diferencia promedio por cruce diario"
              etiquetasX={dias.map(fechaDeDia)}
              formato={(n) => variacion(Math.abs(n) < 1e-9 ? 0 : n)}
              series={evolucion}
            />
          )}
        </Panel>
      </div>

      <TablaComparativa
        filas={filas}
        competidores={visibles}
        propio={propio}
        modo={modo}
        orden={orden}
        onOrden={(o) => poner({ orden: o ? `${o.columna}:${o.sentido}` : null })}
        onAbrir={(f) => poner({ producto: f.ngr.name })}
        vacio={
          <EstadoVacio
            icon={SearchX}
            titulo={
              q.trim() ? "No se encontraron productos con" : "Ningún producto con estos filtros"
            }
            consulta={q.trim() || undefined}
            acciones={
              <Button onClick={() => poner({ q: null, cat: null, conMatch: null })}>
                Limpiar los filtros
              </Button>
            }
          />
        }
      />

      <DetalleDeProducto
        abierto={!!abierta}
        onCerrar={() => poner({ producto: null })}
        fila={abierta}
        comparacion={c}
        marca={marca}
        canal={canal}
        propio={propio}
        colores={colores}
        dias={dias}
        snaps={snaps.map((s) => s.data ?? null)}
      />
    </div>
  );
}

function BloqueDeCompetidor({
  competidor,
  filas,
  propio,
  modo,
  onVer,
  elegido,
  onTodos,
}: {
  competidor: Competidor;
  filas: FilaDeCruce[];
  propio: string;
  modo: Modo;
  onVer: () => void;
  elegido: boolean;
  onTodos: () => void;
}) {
  const r = resumir(filas, competidor.id);
  const tono = tonoDe(posicionDePromedio(r.promedio), modo);
  const colores =
    modo === "competencia"
      ? ["var(--color-pass-soft)", "var(--color-stage-3)", "var(--color-fail-soft)"]
      : // Entre canales no hay bueno ni malo, y las series 1 y 2 ya son
        // Rappi y PedidosYa en los gráficos: el reparto va en la 3 y la 4.
        [colorDeSerie(2, true), "var(--color-stage-3)", colorDeSerie(3, true)];
  return (
    <div className="flex flex-col gap-5 rounded-panel bg-white/[.04] p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-base font-medium text-stage-ink">
          vs {competidor.name}
        </h3>
        <span className="shrink-0 text-meta text-stage-3 tnum">
          {plural(r.productos, "producto")}
        </span>
      </div>
      <Cifra
        oscuro
        tamano="lg"
        etiqueta="Diferencia promedio"
        valor={<span className={tonoDeTexto(tono)}>{variacion(r.promedio)}</span>}
        detalle={fraseDePromedio(r.promedio, sujetoDe(propio, modo), competidor.name)}
      />
      <Proporcion
        oscuro
        titulo={`Productos más baratos, similares y más caros que ${competidor.name}`}
        partes={[
          { id: "barato", etiqueta: "Más barato", valor: r.masBarato, color: colores[0]! },
          { id: "similar", etiqueta: "Similar", valor: r.similar, color: colores[1]! },
          { id: "caro", etiqueta: "Más caro", valor: r.masCaro, color: colores[2]! },
        ]}
      />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-meta text-stage-3">
        <span>
          Índice canasta{" "}
          <span className="font-medium text-stage-ink tnum">
            {r.indice == null ? "—" : numero(r.indice * 100, 0)}
          </span>
          {r.aRevisar > 0 && <> · {plural(r.aRevisar, "a revisar", "a revisar")}</>}
        </span>
        {elegido ? (
          <Button tone="dark" variant="ghost" size="sm" onClick={onTodos}>
            Ver todos
          </Button>
        ) : (
          <Button tone="dark" variant="ghost" size="sm" onClick={onVer}>
            Ver solo {competidor.name}
          </Button>
        )}
      </div>
    </div>
  );
}

function TablaComparativa({
  filas,
  competidores,
  propio,
  modo,
  orden,
  onOrden,
  onAbrir,
  vacio,
}: {
  filas: FilaIndexada[];
  competidores: Competidor[];
  propio: string;
  modo: Modo;
  orden: Orden;
  onOrden: (o: Orden) => void;
  onAbrir: (f: FilaIndexada) => void;
  vacio: ReactNode;
}) {
  const valor = (f: FilaIndexada, col: string): string | number | null | undefined => {
    if (col === "producto") return f.ngr.name.toLowerCase();
    if (col === "precio") return f.ngr.price;
    if (col.startsWith("p:")) return f.matches[col.slice(2)]?.best?.price;
    if (col.startsWith("v:")) return variacionDe(f.ngr.price, f.matches[col.slice(2)]?.best?.price);
    return null;
  };
  // Agrupadas por categoría y ordenadas adentro de cada grupo, como la v1.
  const grupos = new Map<string, FilaIndexada[]>();
  for (const f of filas) {
    const g = categoriaDe(f.ngr.category);
    grupos.set(g, [...(grupos.get(g) ?? []), f]);
  }
  const ordenadas = [...grupos.keys()]
    .sort((a, b) => a.localeCompare(b, "es"))
    .flatMap((g) =>
      ordenar(grupos.get(g)!, orden ?? { columna: "producto", sentido: "asc" }, valor),
    );

  const columnas: Columna<FilaIndexada>[] = [
    {
      id: "producto",
      titulo: "Producto",
      ordenable: true,
      celda: (f) => (
        <button
          type="button"
          onClick={() => onAbrir(f)}
          className="block max-w-[16ch] truncate text-left font-medium text-ink sm:max-w-[26ch] md:max-w-[34ch]"
        >
          {f.ngr.name}
        </button>
      ),
    },
    {
      id: "precio",
      titulo: propio,
      numerica: true,
      ordenable: true,
      celda: (f) => <span className="font-medium">{soles(f.ngr.price)}</span>,
    },
    ...competidores.flatMap((x): Columna<FilaIndexada>[] => [
      {
        id: `p:${x.id}`,
        titulo: x.name,
        numerica: true,
        ordenable: true,
        secundaria: true,
        className: "border-l border-rule/70",
        celda: (f) => {
          const celda = f.matches[x.id];
          if (!celda?.best)
            return (
              <span className="text-ink-4">{celda?.status === "pending" ? "a revisar" : "—"}</span>
            );
          const pendiente = celda.status === "pending";
          return (
            <span className={cn("inline-flex items-center gap-1.5", pendiente && "text-ink-3")}>
              {pendiente && (
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" title="A revisar" />
              )}
              {soles(celda.best.price)}
              {pendiente && <span className="sr-only">(a revisar, no entra en los promedios)</span>}
            </span>
          );
        },
      },
      {
        id: `v:${x.id}`,
        titulo: (
          <>
            <span className="md:hidden">vs {x.name}</span>
            <span className="hidden md:inline">Dif.</span>
          </>
        ),
        numerica: true,
        ordenable: true,
        celda: (f) => {
          const celda = f.matches[x.id];
          const v = variacionDe(f.ngr.price, celda?.best?.price);
          const tono =
            v == null || !celda?.best
              ? "neutral"
              : tonoDe(posicionDeProducto(f.ngr.price, celda.best.price), modo);
          return <Delta valor={v} tono={celda?.status === "pending" ? "neutral" : tono} />;
        },
      },
    ]),
  ];

  return (
    <Panel
      titulo="Tabla comparativa"
      bajada={`Precios en S/ · la diferencia es ${sujetoDe(propio, modo)} contra cada ${modo === "canales" ? "canal" : "competidor"} · ${plural(filas.length, "producto")}. Abrí un producto para ver su detalle y su evolución.`}
      plano
      cuerpo="pt-3"
    >
      <Tabla
        etiqueta="Comparativa de precios por producto"
        columnas={columnas}
        filas={ordenadas}
        clave={(f) => `${f.ngr.name}#${f.i}`}
        orden={orden}
        onOrden={onOrden}
        onFila={onAbrir}
        grupo={(f) => categoriaDe(f.ngr.category)}
        densa
        vacio={vacio}
      />
    </Panel>
  );
}

export function EsqueletoDePrecios() {
  return (
    <div className="space-y-6">
      <span role="status" className="sr-only">
        Cargando la comparativa
      </span>
      <div aria-hidden className="flex flex-col gap-3 md:flex-row md:items-center">
        <Esqueleto className="h-9 w-full md:w-[360px]" />
        <Esqueleto className="h-9 w-full md:w-52" />
        <Esqueleto className="h-9 w-full md:w-52" />
      </div>
      <Panel
        oscuro
        titulo="Contra la competencia"
        bajada="Diferencia promedio producto por producto."
      >
        <div aria-hidden className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-5 rounded-panel bg-white/[.04] p-5">
              <Esqueleto oscuro className="h-5 w-40" />
              <div>
                <Esqueleto oscuro className="h-4 w-28" />
                <Esqueleto oscuro className="mt-2 h-10 w-32" />
                <Esqueleto oscuro className="mt-2 h-4 w-64" />
              </div>
              <Esqueleto oscuro className="h-2.5 w-full rounded-full" />
              <Esqueleto oscuro className="h-4 w-48" />
            </div>
          ))}
        </div>
      </Panel>
      <div aria-hidden className="grid gap-6 lg:grid-cols-2">
        {["Cómo se reparte la diferencia", "Evolución"].map((t) => (
          <Panel key={t} titulo={t} bajada="…">
            <Esqueleto className="h-[240px] w-full" />
          </Panel>
        ))}
      </div>
      <Panel titulo="Tabla comparativa" plano cuerpo="pt-3">
        <EsqueletoDeTabla filas={10} columnas={[3, 1, 1, 1, 1, 1]} />
      </Panel>
    </div>
  );
}
