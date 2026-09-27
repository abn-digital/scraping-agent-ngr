import { ArrowLeft, ArrowRight, Download, PackageOpen, RefreshCw, SearchX } from "lucide-react";
import { Link, useParams } from "react-router";
import { Cifra } from "@/components/datos/Cifra";
import { Delta } from "@/components/datos/Delta";
import { Lineas } from "@/components/datos/Lineas";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea, MensajeCentral } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EsqueletoDeTabla } from "@/components/ui/EsqueletoDeTabla";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Pulso } from "@/components/ui/Pulso";
import { Select } from "@/components/ui/Select";
import { Tabla, ordenar, type Columna } from "@/components/ui/Tabla";
import { Tooltip } from "@/components/ui/Tooltip";
import { useParametros } from "@/hooks/useParametros";
import {
  useActualizando,
  useActualizarTienda,
  useCorrida,
  useHistorial,
  useResultados,
} from "@/lib/consultas";
import { numero } from "@/lib/datos";
import { descargar } from "@/lib/descargar";
import { diaLima, fechaDeDia, fechaHoraLima, fechaLima, horaLima } from "@/lib/lima";
import { plural } from "@/lib/plural";
import { categoriaDe, variacionDe, soles } from "@/lib/precios";
import {
  CANAL_DE_PLATAFORMA,
  MARCAS_NGR,
  NOMBRE_DE_PLATAFORMA,
  sePuedeActualizar,
  tiendaConocida,
} from "@/lib/tiendas";
import type { Corrida, Producto } from "@/lib/tipos";
import { leerOrden } from "./marca/PreciosDeMarca";
import { EvolucionDeProducto } from "./tienda/EvolucionDeProducto";

// Una tienda (v1: el selector de local de "Agregadores" y "Locales propios"):
// su catálogo de precios, cualquier corrida guardada por día y hora, qué
// cambió contra la corrida anterior, bajar el CSV y volver a leerlo.

export const claveDeProducto = (p: Producto) => `${categoriaDe(p.category)}|${p.name}`;

type Fila = Producto & { clave: string; i: number; antes?: number | null; nuevo: boolean };

export default function TiendaPage() {
  const { id = "" } = useParams();
  const [params, poner] = useParametros();
  const corridaPedida = params.get("corrida");
  const q = params.get("q") ?? "";
  const abierto = params.get("producto");
  const orden = leerOrden(params.get("orden"));

  const resultados = useResultados();
  const tienda = resultados.data?.find((t) => t.id === id);
  const conocida = tiendaConocida(id);
  const nombre = conocida?.nombre ?? tienda?.name ?? id;
  const plataforma = tienda?.platform ?? conocida?.plataforma ?? "";
  const historial = useHistorial(id);
  const actualizar = useActualizarTienda(id, nombre);
  const actualizando = useActualizando(id);

  // Todas las corridas, de la más nueva a la más vieja. La del catálogo vigente
  // se suma aunque el historial todavía no la tenga, y el historial puede ir
  // adelantado: manda la más nueva de las dos (como la v1 productiva).
  const runs = [...(historial.data?.runs ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const liveAt = tienda?.lastUpdated ?? null;
  const todas: Corrida[] = [
    ...runs,
    ...(liveAt && !runs.some((r) => r.at === liveAt)
      ? [{ at: liveAt, productCount: tienda?.products.length ?? 0 }]
      : []),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at));
  const ultima = todas[0]?.at ?? null;
  const cargandoHistorial = historial.isLoading || resultados.isLoading;
  // Sin historial (no cargó) no se puede decir que no haya corridas.
  const sinHistorial = historial.isError;
  const seleccion =
    corridaPedida && todas.some((r) => r.at === corridaPedida) ? corridaPedida : ultima;
  const enHistorial = !!seleccion && runs.some((r) => r.at === seleccion);
  const vivo = !seleccion || (seleccion === liveAt && (liveAt === ultima || !enHistorial));
  const corrida = useCorrida(id, vivo ? null : seleccion);
  const productos: Producto[] | undefined = vivo ? tienda?.products : corrida.data?.products;
  const esActual = !seleccion || seleccion === ultima;

  const i = todas.findIndex((r) => r.at === seleccion);
  const anteriorAt = i >= 0 ? todas[i + 1]?.at : undefined;
  const anteriorEsVivo =
    !!anteriorAt && anteriorAt === liveAt && !runs.some((r) => r.at === anteriorAt);
  const anteriorQ = useCorrida(id, anteriorAt && !anteriorEsVivo ? anteriorAt : null, {
    mantener: false,
  });
  const anteriores = anteriorEsVivo ? tienda?.products : anteriorQ.data?.products;

  const precioAntes = new Map((anteriores ?? []).map((p) => [claveDeProducto(p), p.price]));
  const filas: Fila[] = (productos ?? []).map((p, i) => {
    const clave = claveDeProducto(p);
    return {
      ...p,
      clave,
      i,
      antes: anteriores ? (precioAntes.get(clave) ?? null) : undefined,
      nuevo: !!anteriores && !precioAntes.has(clave),
    };
  });
  const cambios = anteriores && productos ? contarCambios(filas, anteriores) : null;

  const plegar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const aguja = plegar(q.trim());
  const visibles = filas.filter(
    (p) => !aguja || plegar(p.name).includes(aguja) || plegar(p.category ?? "").includes(aguja),
  );
  // Por categoría, en el orden del menú (el del scraper).
  const categorias = [...new Set(visibles.map((p) => categoriaDe(p.category)))];
  const valor = (f: Fila, col: string) =>
    col === "producto"
      ? f.name.toLowerCase()
      : col === "precio"
        ? f.price
        : col === "cambio"
          ? variacionDe(f.price, f.antes)
          : null;
  const ordenadas = categorias.flatMap((c) =>
    ordenar(
      visibles.filter((p) => categoriaDe(p.category) === c),
      orden,
      valor,
    ),
  );

  const dias = [...new Set(todas.map((r) => diaLima(r.at)))];
  const dia = seleccion ? diaLima(seleccion) : "";
  const horas = todas.filter((r) => diaLima(r.at) === dia);
  const irA = (at: string | undefined) =>
    poner({ corrida: !at || at === ultima ? null : at, producto: null });

  const marca = MARCAS_NGR.find((m) => m.key === conocida?.marca);
  const canal = CANAL_DE_PLATAFORMA[plataforma];
  const puedeActualizar = sePuedeActualizar(id, plataforma);
  const volver = `/tiendas${canal && canal !== "rappi" ? `?canal=${canal}` : ""}`;

  if (resultados.data && !tienda && !conocida)
    return (
      <MensajeCentral
        eyebrow="404"
        title="Esa tienda no está en la app"
        actions={
          <Button variant="primary" asChild>
            <Link to="/tiendas">Ver las tiendas</Link>
          </Button>
        }
      >
        Puede que el enlace traiga un id viejo. Las tiendas que se leen están en la lista.
      </MensajeCentral>
    );

  const botonActualizar = (
    <Button
      variant="primary"
      loading={actualizando}
      disabled={!puedeActualizar}
      onClick={() => actualizar.mutate()}
    >
      {!actualizando && <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />}
      {actualizando ? (
        "Actualizando…"
      ) : (
        <>
          {/* En el celular los dos botones no entran enteros al lado del título. */}
          <span className="sm:hidden">Actualizar</span>
          <span className="hidden sm:inline">Actualizar el catálogo</span>
        </>
      )}
    </Button>
  );

  const abiertoProducto = abierto ? filas.find((f) => f.clave === abierto) : undefined;

  return (
    <>
      <div className="px-5 pt-6 md:px-10 md:pt-8">
        <div className="mx-auto max-w-[1320px]">
          <Button asChild variant="ghost" size="sm" className="-ml-2.5">
            <Link to={volver}>
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Tiendas
            </Link>
          </Button>
        </div>
      </div>
      <PageHeader
        className="pt-5 md:pt-6"
        eyebrow={`${NOMBRE_DE_PLATAFORMA[plataforma] ?? plataforma} · ${
          conocida?.propia ? "Marca NGR" : marca ? `Competencia de ${marca.label}` : "Tienda"
        }`}
        title={nombre}
        lede={
          tienda?.local ??
          (resultados.isLoading ? (
            <Esqueleto className="inline-block h-5 w-56 align-middle" />
          ) : undefined)
        }
        actions={
          <>
            <Tooltip
              label={
                esActual ? "El catálogo vigente, en CSV" : "El CSV es siempre el catálogo vigente"
              }
            >
              <span>
                <Button
                  disabled={!tienda}
                  onClick={() =>
                    tienda && descargar(`/api/download/${encodeURIComponent(tienda.csvFile)}`)
                  }
                >
                  <Download className="h-4 w-4" strokeWidth={2} aria-hidden />
                  <span className="sm:hidden">CSV</span>
                  <span className="hidden sm:inline">Descargar CSV</span>
                </Button>
              </span>
            </Tooltip>
            {puedeActualizar ? (
              botonActualizar
            ) : (
              <Tooltip label="PedidosYa se actualiza solo en el batch controlado: a mano arriesga un bloqueo.">
                <span tabIndex={0}>{botonActualizar}</span>
              </Tooltip>
            )}
          </>
        }
        meta={
          <>
            <Metric label="Última extracción" value={ultima ? fechaHoraLima(ultima) : "—"} />
            <Metric label="Productos" value={productos ? numero(productos.length) : "…"} />
            <Metric label="Corridas guardadas" value={historial.isLoading ? "…" : runs.length} />
          </>
        }
      />

      {(actualizando || actualizar.isError) && (
        <Contenedor className="pt-5">
          <p aria-live="polite">
            {actualizando ? (
              <Pulso estado="en-curso">
                Leyendo el catálogo en {NOMBRE_DE_PLATAFORMA[plataforma] ?? "su sitio"}… Puede
                tardar hasta cinco minutos; podés seguir usando la app.
              </Pulso>
            ) : (
              <Pulso estado="fallo">
                No se pudo actualizar. El catálogo sigue siendo el del {fechaHoraLima(ultima)}.
              </Pulso>
            )}
          </p>
        </Contenedor>
      )}

      <Contenedor className="pt-10 md:pt-14" aria-label="Corrida y búsqueda">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <div className="sm:w-44">
              <label htmlFor="dia" className="label mb-1.5 block">
                Día
              </label>
              <Select
                id="dia"
                label="Día de la corrida"
                value={dia}
                onChange={(d) => irA(todas.find((r) => diaLima(r.at) === d)?.at)}
                options={dias.map((d) => ({
                  value: d,
                  label: fechaDeDia(d),
                  hint: plural(todas.filter((r) => diaLima(r.at) === d).length, "corrida"),
                }))}
                placeholder={cargandoHistorial ? "…" : "Sin corridas"}
                disabled={dias.length === 0}
              />
            </div>
            <div className="sm:w-52">
              <label htmlFor="hora" className="label mb-1.5 block">
                Hora (Lima)
              </label>
              <Select
                id="hora"
                label="Hora de la corrida"
                value={seleccion ?? ""}
                onChange={(at) => irA(at)}
                options={horas.map((r) => ({
                  value: r.at,
                  label: horaLima(r.at),
                  hint: plural(r.productCount, "producto"),
                }))}
                placeholder={cargandoHistorial ? "…" : "Sin corridas"}
                disabled={horas.length === 0}
              />
            </div>
            <div className="col-span-2 flex h-9 items-center sm:col-span-1">
              {seleccion &&
                (esActual ? <Chip tone="muted">Actual</Chip> : <Chip tone="warn">Histórico</Chip>)}
            </div>
          </div>
          <CampoBusqueda
            size="md"
            value={q}
            onChange={(v) => poner({ q: v })}
            placeholder="Buscar un producto o una categoría"
            ariaLabel="Buscar en el catálogo"
            anuncio={productos ? plural(visibles.length, "producto") : undefined}
          />
        </div>
        {historial.isError && (
          <div className="mt-4">
            <ErrorEnLinea
              error={historial.error}
              onRetry={() => void historial.refetch()}
              recurso="el historial"
            />
          </div>
        )}
      </Contenedor>

      <Contenedor className="pt-6">
        {!esActual && seleccion && (
          <Notice
            tone="warn"
            className="mb-6"
            title={`Corrida del ${fechaHoraLima(seleccion)}`}
            action={
              <Button variant="ghost" size="sm" onClick={() => irA(undefined)}>
                Ver la actual
              </Button>
            }
          >
            Los precios de hoy pueden ser otros.
          </Notice>
        )}

        {/* En el celular: primero qué cambió, después el catálogo y al final el
            resto. En escritorio, el catálogo a la izquierda y lo demás al costado. */}
        <div
          className="grid grid-cols-1 gap-6 [grid-template-areas:'cambios'_'tabla'_'resto']
            lg:grid-cols-[minmax(0,1fr)_340px] lg:grid-rows-[auto_1fr] lg:[grid-template-areas:'tabla_cambios'_'tabla_resto']"
        >
          <div className="min-w-0 [grid-area:tabla]">
            {resultados.isError ? (
              <ErrorEnLinea
                error={resultados.error}
                onRetry={() => void resultados.refetch()}
                recurso="el catálogo"
              />
            ) : corrida.isError && !vivo ? (
              <ErrorEnLinea
                error={corrida.error}
                onRetry={() => void corrida.refetch()}
                recurso="esa corrida"
              />
            ) : !productos ? (
              <Panel titulo="Catálogo de precios" plano cuerpo="pt-3">
                <span role="status" className="sr-only">
                  Cargando el catálogo
                </span>
                <EsqueletoDeTabla filas={12} columnas={[4, 1, 1]} />
              </Panel>
            ) : productos.length === 0 ? (
              <Panel>
                <EstadoVacio
                  icon={PackageOpen}
                  titulo={`Ningún producto de ${nombre} todavía`}
                  bajada={
                    puedeActualizar
                      ? "Actualizá el catálogo para leerlo por primera vez."
                      : "Se va a leer en la próxima corrida del batch de PedidosYa."
                  }
                />
              </Panel>
            ) : (
              <Panel
                titulo="Catálogo de precios"
                bajada={`${plural(visibles.length, "producto")} en ${plural(categorias.length, "categoría")}${
                  anteriores ? " · el cambio es contra la corrida anterior" : ""
                }`}
                plano
                cuerpo="pt-3"
              >
                <Tabla
                  etiqueta={`Catálogo de ${nombre}`}
                  columnas={columnasDelCatalogo(!!anteriores, (f) => poner({ producto: f.clave }))}
                  filas={ordenadas}
                  clave={(f) => `${f.clave}#${f.i}`}
                  grupo={(f) => categoriaDe(f.category)}
                  orden={orden}
                  onOrden={(o) => poner({ orden: o ? `${o.columna}:${o.sentido}` : null })}
                  onFila={(f) => poner({ producto: f.clave })}
                  vacio={
                    <EstadoVacio
                      icon={SearchX}
                      titulo="No se encontraron productos con"
                      consulta={q.trim()}
                      acciones={
                        <Button onClick={() => poner({ q: null })}>Limpiar la búsqueda</Button>
                      }
                    />
                  }
                />
              </Panel>
            )}
          </div>

          <section className="[grid-area:cambios]" aria-label="Cambios contra la corrida anterior">
            <Panel
              titulo="Cambios"
              bajada={
                cargandoHistorial || (sinHistorial && !anteriorAt)
                  ? "Contra la corrida anterior."
                  : anteriorAt
                    ? `Contra la corrida del ${fechaHoraLima(anteriorAt)}.`
                    : "Todavía no hay una corrida anterior."
              }
            >
              {cargandoHistorial ? (
                <EsqueletoDeCambios />
              ) : sinHistorial && !anteriorAt ? (
                <p className="text-meta text-ink-3">
                  Sin el historial no se pueden ver los cambios.
                </p>
              ) : !anteriorAt ? (
                <p className="text-meta text-ink-3">
                  Con la próxima corrida se ve qué subió y qué bajó.
                </p>
              ) : !cambios ? (
                <EsqueletoDeCambios />
              ) : (
                <div className="grid grid-cols-2 gap-5">
                  <Cifra tamano="sm" etiqueta="Subieron" valor={numero(cambios.subieron)} />
                  <Cifra tamano="sm" etiqueta="Bajaron" valor={numero(cambios.bajaron)} />
                  <Cifra tamano="sm" etiqueta="Nuevos" valor={numero(cambios.nuevos)} />
                  <Cifra tamano="sm" etiqueta="Ya no están" valor={numero(cambios.salieron)} />
                </div>
              )}
            </Panel>
          </section>

          <aside className="space-y-6 [grid-area:resto] lg:self-start" aria-label="Historial">
            <Panel
              titulo="Productos por corrida"
              bajada="Una caída brusca suele ser un scrape que falló."
            >
              {cargandoHistorial ? (
                <Esqueleto className="h-[150px] w-full" />
              ) : sinHistorial && todas.length < 2 ? (
                <p className="text-meta text-ink-3">No se pudo cargar el historial.</p>
              ) : todas.length < 2 ? (
                <p className="text-meta text-ink-3">
                  {todas.length === 1
                    ? `Hay una sola corrida, del ${fechaLima(todas[0]!.at)}.`
                    : "Todavía no hay corridas."}
                </p>
              ) : (
                <Lineas
                  titulo="Productos detectados en cada corrida"
                  alto={150}
                  etiquetasX={[...todas]
                    .slice(0, 60)
                    .reverse()
                    .map((r) => fechaLima(r.at))}
                  series={[
                    {
                      id: "productos",
                      etiqueta: "Productos",
                      color: "var(--color-dato-1)",
                      valores: [...todas]
                        .slice(0, 60)
                        .reverse()
                        .map((r) => r.productCount),
                    },
                  ]}
                />
              )}
            </Panel>

            {marca && canal && (
              <Panel titulo="En la comparativa">
                <p className="text-base text-ink-2">
                  {conocida?.propia
                    ? `Es la tienda de ${marca.label} contra la que se cruza su competencia en ${NOMBRE_DE_PLATAFORMA[plataforma]}.`
                    : `Se compara con ${marca.label} en ${NOMBRE_DE_PLATAFORMA[plataforma]}.`}
                </p>
                <Link
                  to={`/marcas/${marca.key}${canal === "rappi" ? "" : `?canal=${canal}`}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-meta text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ember"
                >
                  Ver la comparativa de {marca.label}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </Link>
              </Panel>
            )}
          </aside>
        </div>
      </Contenedor>

      <EvolucionDeProducto
        abierto={!!abiertoProducto}
        onCerrar={() => poner({ producto: null })}
        producto={abiertoProducto}
        tiendaId={id}
        corridas={todas}
        enHistorial={runs.map((r) => r.at)}
        vigentes={tienda?.products ?? []}
        liveAt={liveAt}
      />
      <div className="h-16" />
    </>
  );
}

function contarCambios(filas: Fila[], anteriores: Producto[]) {
  const ahora = new Set(filas.map((f) => f.clave));
  let subieron = 0;
  let bajaron = 0;
  for (const f of filas) {
    if (f.antes == null) continue;
    if (f.price > f.antes + 0.005) subieron++;
    else if (f.price < f.antes - 0.005) bajaron++;
  }
  return {
    subieron,
    bajaron,
    nuevos: filas.filter((f) => f.nuevo).length,
    salieron: new Set(anteriores.map(claveDeProducto).filter((k) => !ahora.has(k))).size,
  };
}

function columnasDelCatalogo(conCambio: boolean, onAbrir: (f: Fila) => void): Columna<Fila>[] {
  const columnas: Columna<Fila>[] = [
    {
      id: "producto",
      titulo: "Producto",
      ordenable: true,
      celda: (f) => (
        <button type="button" onClick={() => onAbrir(f)} className="block max-w-full text-left">
          <span className="block font-medium text-ink">{f.name}</span>
          {f.description?.trim() && (
            <span className="mt-0.5 line-clamp-1 max-w-[60ch] text-meta text-ink-3">
              {f.description}
            </span>
          )}
        </button>
      ),
    },
    {
      id: "precio",
      titulo: "Precio",
      numerica: true,
      ordenable: true,
      ancho: "9rem",
      celda: (f) => {
        const oferta = typeof f.originalPrice === "number" && f.originalPrice > f.price;
        return (
          <span className="inline-flex flex-col items-end">
            <span className="whitespace-nowrap font-medium">{soles(f.price)}</span>
            {oferta && (
              <span className="whitespace-nowrap text-meta text-ink-3">
                <span className="line-through">{soles(f.originalPrice)}</span>
                {f.promoPartner && <span className="ml-1">{f.promoPartner}</span>}
              </span>
            )}
            {f.inStock === false && <span className="text-meta text-ink-3">Sin stock</span>}
          </span>
        );
      },
    },
  ];
  if (conCambio)
    columnas.push({
      id: "cambio",
      titulo: "Cambio",
      numerica: true,
      ordenable: true,
      secundaria: true,
      ancho: "7rem",
      celda: (f) =>
        f.nuevo ? (
          <Chip tone="muted">Nuevo</Chip>
        ) : f.antes != null && Math.abs(f.price - f.antes) > 0.005 ? (
          <span className="inline-flex flex-col items-end">
            <Delta valor={variacionDe(f.price, f.antes)} />
            <span className="text-meta text-ink-3 line-through">{soles(f.antes)}</span>
          </span>
        ) : null,
    });
  return columnas;
}

function EsqueletoDeCambios() {
  return (
    <div aria-hidden className="grid grid-cols-2 gap-5">
      {[0, 1, 2, 3].map((k) => (
        <div key={k}>
          <Esqueleto className="h-4 w-16" />
          <Esqueleto className="mt-2 h-6 w-10" />
        </div>
      ))}
    </div>
  );
}
