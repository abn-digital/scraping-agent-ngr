import { ArrowRight, ChevronRight, Scale } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BarrasDivergentes } from "@/components/datos/BarrasDivergentes";
import { Cifra } from "@/components/datos/Cifra";
import { Delta } from "@/components/datos/Delta";
import { Proporcion } from "@/components/datos/Proporcion";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EsqueletoDeTabla } from "@/components/ui/EsqueletoDeTabla";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Tabla, type Columna } from "@/components/ui/Tabla";
import { crucesDe, paresDe, totalesDe, type ComparacionDeMarca, type Cruce } from "@/lib/analisis";
import { cn } from "@/lib/cn";
import { useComparaciones, useMarcas, useResultados } from "@/lib/consultas";
import { colorDeSerie, numero, variacion } from "@/lib/datos";
import { antiguedad, diasDesde, fechaHoraLima, fechaLima } from "@/lib/lima";
import { plural } from "@/lib/plural";
import { posicionDePromedio, tonoDe, type Modo, soles } from "@/lib/precios";
import {
  CANALES,
  MARCAS_NGR,
  PLATAFORMA_DE_CANAL,
  TIENDAS,
  esCanal,
  type TiendaConocida,
} from "@/lib/tiendas";
import type { Canal, Tienda } from "@/lib/tipos";

// La primera pregunta: ¿estoy más caro o más barato que mi competencia, y
// dónde? Todas las marcas de NGR en un canal, contra cada competidor.

const TEXTOS: Record<
  Modo,
  {
    hero: (canal: string) => string;
    bajada: string;
    lados: [string, string];
    partes: [string, string, string];
    caro: string;
    barato: string;
    bajadaCaro: string;
    bajadaBarato: string;
    propio: string;
    otro: string;
  }
> = {
  competencia: {
    hero: (canal) => `Contra la competencia, en ${canal}`,
    bajada: "Diferencia promedio de cada marca contra cada competidor, producto por producto.",
    lados: ["NGR más barato", "NGR más caro"],
    partes: ["Más barato", "Similar", "Más caro"],
    caro: "Donde NGR está más caro",
    barato: "Donde NGR está más barato",
    bajadaCaro: "Los ocho productos donde la competencia está más barata.",
    bajadaBarato: "Los ocho productos donde NGR le gana en precio a la competencia.",
    propio: "NGR",
    otro: "Competencia",
  },
  canales: {
    hero: () => "El sitio propio contra los otros canales",
    bajada:
      "Cuánto más caro o más barato está el sitio propio de cada marca que su Rappi y su PedidosYa.",
    lados: ["Sitio propio más barato", "Sitio propio más caro"],
    partes: ["Más barato en el sitio", "Similar", "Más caro en el sitio"],
    caro: "Donde el sitio propio está más caro",
    barato: "Donde el sitio propio está más barato",
    bajadaCaro: "Los ocho productos que cuestan más en el sitio que en Rappi o PedidosYa.",
    bajadaBarato: "Los ocho productos que cuestan menos en el sitio que en Rappi o PedidosYa.",
    propio: "Sitio propio",
    otro: "Canal",
  },
};

const tonoDeTexto = (t: "pass" | "fail" | "neutral") =>
  t === "pass" ? "text-pass-soft" : t === "fail" ? "text-fail-soft" : "text-stage-ink";

export default function ResumenPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const crudo = params.get("canal");
  const canal: Canal = esCanal(crudo) ? crudo : "rappi";
  const modo: Modo = canal === "cross" ? "canales" : "competencia";
  const t = TEXTOS[modo];
  const nombreDeCanal = CANALES.find((c) => c.value === canal)!.label;

  const marcas = useMarcas();
  const conCruce = (marcas.data ?? []).filter((m) =>
    m.channels.some((c) => c.channel === canal && c.hasMatches),
  );
  const consultas = useComparaciones(conCruce.map((m) => ({ marca: m.key, canal })));
  const resultados = useResultados();

  const cargando = marcas.isLoading || consultas.some((q) => q.isLoading);
  const items: ComparacionDeMarca[] = conCruce.flatMap((m, i) => {
    const c = consultas[i]?.data;
    return c ? [{ marca: { key: m.key, label: m.label }, comparacion: c }] : [];
  });
  const fallidas = consultas.filter((q) => q.isError);

  const pares = paresDe(items).filter((p) => p.resumen.promedio != null);
  const totales = totalesDe(pares);
  const cruces = crucesDe(items);
  const masCaros = cruces
    .filter((c) => c.tono === "fail" || (modo === "canales" && c.variacion > 0.0005))
    .sort((a, b) => b.variacion - a.variacion)
    .slice(0, 8);
  const masBaratos = cruces
    .filter((c) => c.tono === "pass" || (modo === "canales" && c.variacion < -0.0005))
    .sort((a, b) => a.variacion - b.variacion)
    .slice(0, 8);
  const ultimoCalculo = items
    .map((i) => i.comparacion.generatedAt)
    .filter((g): g is string => !!g)
    .sort()
    .at(-1);
  const tonoGeneral = tonoDe(posicionDePromedio(totales.promedio), modo);

  const elegirCanal = (v: Canal) => {
    const sig = new URLSearchParams(params);
    if (v === "rappi") sig.delete("canal");
    else sig.set("canal", v);
    setParams(sig, { replace: true });
  };

  const colores =
    modo === "competencia"
      ? ["var(--color-pass-soft)", "var(--color-stage-3)", "var(--color-fail-soft)"]
      : // Entre canales no hay bueno ni malo, y las series 1 y 2 ya son
        // Rappi y PedidosYa en los gráficos: el reparto va en la 3 y la 4.
        [colorDeSerie(2, true), "var(--color-stage-3)", colorDeSerie(3, true)];

  return (
    <>
      <PageHeader
        eyebrow="NGR · Perú"
        title="Resumen"
        lede="Cuánto más caras o más baratas están las marcas de NGR frente a su competencia, en cada canal."
        meta={
          <>
            <Metric
              label="Último cruce"
              value={ultimoCalculo ? fechaHoraLima(ultimoCalculo) : "—"}
            />
            <Metric label="Productos cruzados" value={cargando ? "…" : numero(totales.productos)} />
          </>
        }
      />

      <Contenedor className="pt-10 md:pt-14" aria-label="Filtros">
        <Segmented
          ariaLabel="Canal"
          value={canal}
          onChange={elegirCanal}
          options={CANALES.map((c) => ({ value: c.value, label: c.label }))}
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
          <EsqueletoDelResumen />
        ) : items.length === 0 && fallidas.length > 0 ? (
          <ErrorEnLinea
            error={fallidas[0]!.error}
            onRetry={() => fallidas.forEach((q) => void q.refetch())}
            recurso="las comparativas"
          />
        ) : items.length === 0 ? (
          <Panel>
            <EstadoVacio
              icon={Scale}
              titulo={`Ningún cruce todavía en ${nombreDeCanal}`}
              bajada="El cruce de productos corre una vez por día, a las 20:00 de Lima. Volvé después del job diario."
              acciones={
                <Link
                  to="/tiendas"
                  className="text-base text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ember"
                >
                  Ver los catálogos
                </Link>
              }
            />
          </Panel>
        ) : (
          <div className="space-y-6">
            {fallidas.length > 0 && (
              <ErrorEnLinea
                error={fallidas[0]!.error}
                onRetry={() => fallidas.forEach((q) => void q.refetch())}
                recurso={plural(fallidas.length, "comparativa")}
              />
            )}

            <Panel oscuro titulo={t.hero(nombreDeCanal)} bajada={t.bajada}>
              <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
                <div className="space-y-7">
                  <Cifra
                    oscuro
                    tamano="lg"
                    etiqueta="Diferencia promedio"
                    valor={
                      <span className={tonoDeTexto(tonoGeneral)}>
                        {variacion(totales.promedio)}
                      </span>
                    }
                    detalle={`${plural(totales.productos, "producto cruzado", "productos cruzados")}`}
                  />
                  <div>
                    <p className="label mb-2.5 text-stage-3">Cómo se reparten</p>
                    <Proporcion
                      oscuro
                      titulo="Cómo se reparten los productos cruzados"
                      partes={[
                        {
                          id: "barato",
                          etiqueta: t.partes[0],
                          valor: totales.masBarato,
                          color: colores[0]!,
                        },
                        {
                          id: "similar",
                          etiqueta: t.partes[1],
                          valor: totales.similar,
                          color: colores[1]!,
                        },
                        {
                          id: "caro",
                          etiqueta: t.partes[2],
                          valor: totales.masCaro,
                          color: colores[2]!,
                        },
                      ]}
                    />
                  </div>
                  {totales.aRevisar > 0 && (
                    <p className="text-meta text-stage-3">
                      {plural(totales.aRevisar, "cruce", "cruces")} a revisar no{" "}
                      {totales.aRevisar === 1 ? "entra" : "entran"} en los promedios.{" "}
                      <Link
                        to={`/revision${canal === "rappi" ? "" : `?canal=${canal}`}`}
                        className="text-stage-ink underline decoration-white/25 underline-offset-4 hover:decoration-ember"
                      >
                        Revisarlos
                      </Link>
                    </p>
                  )}
                </div>
                <BarrasDivergentes
                  oscuro
                  titulo="Diferencia promedio por marca y competidor"
                  lados={t.lados}
                  barras={pares.map((p) => ({
                    id: `${p.marca.key}|${p.competidor.id}`,
                    etiqueta: `vs ${p.competidor.name}`,
                    detalle: plural(p.resumen.productos, "producto"),
                    valor: p.resumen.promedio!,
                    // Entre canales no hay bueno ni malo: la serie, no un estado.
                    tono:
                      modo === "competencia"
                        ? tonoDe(posicionDePromedio(p.resumen.promedio), modo)
                        : undefined,
                    grupo: p.marca.label,
                  }))}
                  onElegir={(id) => {
                    const [marca, competidor] = id.split("|");
                    const q = new URLSearchParams();
                    if (canal !== "rappi") q.set("canal", canal);
                    q.set("competidor", competidor!);
                    navigate(`/marcas/${marca}?${q}`);
                  }}
                />
              </div>
            </Panel>

            <div className="grid gap-6 2xl:grid-cols-2">
              <TablaDeCruces
                titulo={t.caro}
                bajada={t.bajadaCaro}
                cruces={masCaros}
                canal={canal}
                columnas={[t.propio, t.otro]}
                vacio={
                  modo === "competencia"
                    ? "Ningún producto más caro que la competencia."
                    : "Ningún producto más caro en el sitio."
                }
              />
              <TablaDeCruces
                titulo={t.barato}
                bajada={t.bajadaBarato}
                cruces={masBaratos}
                canal={canal}
                columnas={[t.propio, t.otro]}
                vacio={
                  modo === "competencia"
                    ? "Ningún producto más barato que la competencia."
                    : "Ningún producto más barato en el sitio."
                }
              />
            </div>
          </div>
        )}
      </Contenedor>

      <Contenedor className="pt-6">
        <Frescura
          canal={canal}
          tiendas={resultados.data}
          cargando={resultados.isLoading}
          error={resultados.error}
          onRetry={() => void resultados.refetch()}
        />
      </Contenedor>

      <div className="h-16" />
    </>
  );
}

function TablaDeCruces({
  titulo,
  bajada,
  cruces,
  canal,
  columnas: [propio, otro],
  vacio,
}: {
  titulo: string;
  bajada: string;
  cruces: Cruce[];
  canal: Canal;
  columnas: [string, string];
  vacio: string;
}) {
  const navigate = useNavigate();
  const abrir = (c: Cruce) => {
    const q = new URLSearchParams();
    if (canal !== "rappi") q.set("canal", canal);
    q.set("producto", c.fila.ngr.name);
    navigate(`/marcas/${c.marca.key}?${q}`);
  };
  const columnas: Columna<Cruce>[] = [
    {
      id: "producto",
      titulo: "Producto",
      celda: (c) => (
        <button
          type="button"
          onClick={() => abrir(c)}
          className="block max-w-[20ch] text-left sm:max-w-[34ch]"
        >
          <span className="block truncate font-medium text-ink">{c.fila.ngr.name}</span>
          <span className="block truncate text-meta text-ink-3">
            {c.marca.label} vs {c.competidor.name} · {c.otro}
          </span>
        </button>
      ),
    },
    {
      id: "propio",
      titulo: propio,
      numerica: true,
      secundaria: true,
      celda: (c) => soles(c.propio),
    },
    {
      id: "otro",
      titulo: otro,
      numerica: true,
      secundaria: true,
      celda: (c) => soles(c.precioOtro),
    },
    {
      id: "dif",
      titulo: "Diferencia",
      numerica: true,
      celda: (c) => <Delta valor={c.variacion} tono={c.tono} />,
    },
  ];
  return (
    <Panel titulo={titulo} bajada={bajada} plano cuerpo="pt-3">
      <Tabla
        etiqueta={titulo}
        columnas={columnas}
        filas={cruces}
        clave={(c) => `${c.marca.key}|${c.competidor.id}|${c.fila.ngr.name}`}
        onFila={abrir}
        densa
        vacio={<p className="px-5 py-10 text-center text-meta text-ink-3">{vacio}</p>}
      />
    </Panel>
  );
}

const VIEJO = 14;

function Frescura({
  canal,
  tiendas,
  cargando,
  error,
  onRetry,
}: {
  canal: Canal;
  tiendas: Tienda[] | undefined;
  cargando: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const plataforma = canal === "cross" ? null : PLATAFORMA_DE_CANAL[canal];
  const porId = new Map((tiendas ?? []).map((t) => [t.id, t]));
  const filas = TIENDAS.filter((t) => !plataforma || t.plataforma === plataforma)
    .map((t) => ({ conocida: t, tienda: porId.get(t.id) }))
    .sort((a, b) => (a.tienda?.lastUpdated ?? "").localeCompare(b.tienda?.lastUpdated ?? ""));
  const viejas = filas.filter((f) => (diasDesde(f.tienda?.lastUpdated) ?? Infinity) > VIEJO).length;

  return (
    <Panel
      titulo="Qué tan frescos están los catálogos"
      bajada={
        cargando || error
          ? "Si un catálogo es viejo, la diferencia de precio también."
          : viejas > 0
            ? `${plural(viejas, "catálogo tiene", "catálogos tienen")} más de ${VIEJO} días. Si un catálogo es viejo, la diferencia de precio también.`
            : "Todos los catálogos se leyeron en las últimas dos semanas."
      }
      acciones={
        <Link
          to={`/tiendas${plataforma && canal !== "rappi" ? `?canal=${canal}` : ""}`}
          className="inline-flex items-center gap-1.5 text-meta text-ink-2 underline decoration-rule-strong underline-offset-4 hover:decoration-ember"
        >
          Ver todas las tiendas
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </Link>
      }
      plano
      cuerpo="px-2 pb-2 pt-3"
    >
      {error ? (
        <div className="px-3 pb-3">
          <ErrorEnLinea error={error} onRetry={onRetry} recurso="los catálogos" />
        </div>
      ) : cargando ? (
        <div aria-hidden className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-[3.75rem] items-center gap-3 px-3">
              <Esqueleto className="h-4 w-40" />
              <Esqueleto className="ml-auto h-4 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-x-2 md:grid-cols-2">
          {filas.slice(0, 6).map(({ conocida, tienda }) => (
            <FilaDeFrescura key={conocida.id} conocida={conocida} tienda={tienda} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function FilaDeFrescura({ conocida, tienda }: { conocida: TiendaConocida; tienda?: Tienda }) {
  const dias = diasDesde(tienda?.lastUpdated);
  const marca = MARCAS_NGR.find((m) => m.key === conocida.marca)?.label ?? conocida.marca;
  return (
    <li>
      <Link
        to={`/tiendas/${encodeURIComponent(conocida.id)}`}
        className="group flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-150 hover:bg-paper-sunken/60"
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-base font-medium text-ink">{conocida.nombre}</span>
          <span className="block truncate text-meta text-ink-3">
            {conocida.propia ? "Marca NGR" : `Competencia de ${marca}`} ·{" "}
            {tienda?.lastUpdated ? fechaLima(tienda.lastUpdated) : "sin extracción"}
          </span>
        </span>
        {dias != null && dias > VIEJO ? (
          <span className="whitespace-nowrap text-meta">
            <Chip tone="warn">{antiguedad(tienda!.lastUpdated!)}</Chip>
          </span>
        ) : (
          <span className={cn("text-meta tnum", dias == null ? "text-ink-4" : "text-ink-3")}>
            {tienda?.lastUpdated ? antiguedad(tienda.lastUpdated) : "—"}
          </span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" strokeWidth={1.75} aria-hidden />
      </Link>
    </li>
  );
}

function EsqueletoDelResumen() {
  return (
    <div className="space-y-6">
      <span role="status" className="sr-only">
        Cargando el resumen
      </span>
      <Panel
        oscuro
        titulo="Contra la competencia"
        bajada="Diferencia promedio de cada marca contra cada competidor."
      >
        <div aria-hidden className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12">
          <div className="space-y-7">
            <div>
              <Esqueleto oscuro className="h-4 w-32" />
              <Esqueleto oscuro className="mt-2 h-10 w-36" />
              <Esqueleto oscuro className="mt-2 h-4 w-40" />
            </div>
            <Esqueleto oscuro className="h-2.5 w-full rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,clamp(7rem,36%,15rem))_minmax(0,1fr)_3.75rem] items-center gap-x-3"
              >
                <Esqueleto oscuro className="h-4 w-28" />
                <Esqueleto
                  oscuro
                  className="h-2.5"
                  style={{ width: `${20 + ((i * 29) % 30)}%`, marginLeft: i % 3 ? "50%" : "30%" }}
                />
                <Esqueleto oscuro className="ml-auto h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <div className="grid gap-6 2xl:grid-cols-2">
        {[0, 1].map((i) => (
          <Panel
            key={i}
            titulo={i ? "Donde NGR está más barato" : "Donde NGR está más caro"}
            plano
            cuerpo="pt-3"
          >
            <EsqueletoDeTabla filas={8} columnas={[3, 1, 1, 1]} />
          </Panel>
        ))}
      </div>
    </div>
  );
}
