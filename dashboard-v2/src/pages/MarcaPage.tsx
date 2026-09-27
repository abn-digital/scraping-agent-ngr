import { useEffect } from "react";
import { Scale, Store } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { Contenedor } from "@/components/layout/Contenedor";
import { ErrorEnLinea, MensajeCentral } from "@/components/layout/Estados";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { useParametros } from "@/hooks/useParametros";
import { useTituloDePagina } from "@/hooks/useTituloDePagina";
import { useComparacion, useFechas, useMarcas } from "@/lib/consultas";
import { fechaDeDia, fechaHoraLima } from "@/lib/lima";
import { conDatos, pendientes } from "@/lib/precios";
import { recordarMarca } from "@/lib/recordar";
import {
  ANCLAS,
  CANALES,
  MARCAS_NGR,
  NOMBRE_DE_CANAL,
  PLATAFORMA_DE_CANAL,
  TIENDAS,
  esCanal,
} from "@/lib/tiendas";
import type { Canal } from "@/lib/tipos";
import { EsqueletoDePrecios, PreciosDeMarca } from "./marca/PreciosDeMarca";
import { EsqueletoDeRevision, RevisionDeMarca } from "./marca/RevisionDeMarca";

// La comparativa de una marca en un canal (v1: pestaña Comparativa). Dos vistas
// de lo mismo: los precios contra cada competidor y la revisión de los cruces.
// La marca va en la ruta; el canal, la fecha del cruce y los filtros, en la URL.

export default function MarcaPage({ vista }: { vista: "precios" | "revision" }) {
  const { marca = "" } = useParams();
  const navigate = useNavigate();
  const [params, poner] = useParametros();
  const crudo = params.get("canal");
  const canal: Canal = esCanal(crudo) ? crudo : "rappi";
  const fecha = params.get("fecha") || null;

  const marcas = useMarcas();
  const info = marcas.data?.find((m) => m.key === marca);
  const comparacion = useComparacion(
    info ? marca : undefined,
    canal,
    fecha,
    info?.channels.find((x) => x.channel === canal)?.hasMatches !== false,
  );
  const fechas = useFechas(info ? marca : undefined, canal);

  useEffect(() => {
    if (info) recordarMarca(info.key);
  }, [info]);

  useTituloDePagina(info ? `${info.label} · Comparativa` : "Comparativa");

  if (marcas.isError)
    return (
      <Contenedor className="pt-14">
        <ErrorEnLinea
          error={marcas.error}
          onRetry={() => void marcas.refetch()}
          recurso="la lista de marcas"
        />
      </Contenedor>
    );
  if (marcas.data && !info)
    return (
      <MensajeCentral
        eyebrow="404"
        title="Esa marca no está en la comparativa"
        actions={
          <Button variant="primary" asChild>
            <Link to="/marcas/bembos">Ir a Bembos</Link>
          </Button>
        }
      >
        Las marcas de NGR que se comparan son Bembos, Popeyes, Papa Johns, Chinawok, Dunkin' y Don
        Belisario.
      </MensajeCentral>
    );

  const c = comparacion.data;
  const canalInfo = info?.channels.find((x) => x.channel === canal);
  // Mientras la API no contesta, lo que se sabe de antemano (las tiendas de la
  // v1) arma el título y la bajada: el encabezado no salta cuando llegan los datos.
  const estatica = MARCAS_NGR.find((m) => m.key === marca);
  const deAntemano =
    canal === "cross"
      ? []
      : TIENDAS.filter(
          (t) => t.marca === marca && !t.propia && t.plataforma === PLATAFORMA_DE_CANAL[canal],
        ).map((t) => ({ id: t.id, name: t.nombre }));
  const competidores = c ? conDatos(c.competitors) : (canalInfo?.competitors ?? deAntemano);
  const nombres = competidores.map((x) => x.name);
  const listaDeNombres =
    nombres.length <= 1
      ? (nombres[0] ?? "")
      : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
  const label = info?.label ?? estatica?.label ?? "";
  const lede =
    canal === "cross"
      ? `Sus precios en el sitio propio contra ${listaDeNombres || "sus otros canales"}.`
      : `Sus precios en ${canal === "propio" ? "su sitio propio" : NOMBRE_DE_CANAL[canal]} contra ${
          listaDeNombres || "su competencia"
        }.`;
  const ancla = ANCLAS[marca]?.[canal === "cross" ? "propio" : canal];
  const hayPendientes = c ? pendientes(c) : 0;
  const soloLectura = !!c?.isHistorical;

  const irAVista = (v: "precios" | "revision") => {
    const q = new URLSearchParams();
    if (canal !== "rappi") q.set("canal", canal);
    if (fecha) q.set("fecha", fecha);
    const s = q.toString();
    navigate(`/marcas/${marca}${v === "revision" ? "/revision" : ""}${s ? `?${s}` : ""}`);
  };

  // Un día que vino en el enlace y no está en la lista se muestra igual: el
  // selector no puede quedar en blanco.
  const dias = [...(fechas.data?.dates ?? [])];
  if (fecha && !dias.includes(fecha)) dias.unshift(fecha);
  const opcionesDeFecha = [
    { value: "", label: "Actual", hint: "El último cruce, con las decisiones manuales" },
    ...dias.map((d) => ({
      value: d,
      label: fechaDeDia(d),
      hint: d === fechas.data?.today ? "Hoy" : undefined,
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Comparativa"
        title={label || "…"}
        lede={label ? lede : undefined}
        actions={
          ancla && (
            <Button asChild variant="quiet" size="sm">
              <Link to={`/tiendas/${encodeURIComponent(ancla)}`}>
                <Store className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Ver su catálogo
              </Link>
            </Button>
          )
        }
        meta={
          c === null ? undefined : (
            <>
              <Metric label="Cruce" value={c ? fechaHoraLima(c.generatedAt) : "…"} />
              <Metric
                label="Modelo"
                value={<span className="font-mono">{c ? (c.model ?? "—") : "…"}</span>}
              />
              <Metric label="Productos" value={c ? c.rows.length : "…"} />
            </>
          )
        }
      />

      <Contenedor className="pt-10 md:pt-14" aria-label="Qué se compara">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
            <div className="min-w-0 sm:w-48">
              <label htmlFor="marca" className="label mb-1.5 block">
                Marca
              </label>
              <Select
                id="marca"
                label="Marca"
                value={marca}
                onChange={(m) => {
                  const q = new URLSearchParams();
                  if (canal !== "rappi") q.set("canal", canal);
                  const s = q.toString();
                  navigate(
                    `/marcas/${m}${vista === "revision" ? "/revision" : ""}${s ? `?${s}` : ""}`,
                  );
                }}
                options={(marcas.data ?? MARCAS_NGR).map((m) => ({ value: m.key, label: m.label }))}
                disabled={!marcas.data}
              />
            </div>
            <div className="order-last col-span-2 min-w-0 sm:order-none">
              <p className="label mb-1.5">Canal</p>
              <Segmented
                ariaLabel="Canal"
                value={canal}
                onChange={(v) =>
                  poner({
                    canal: v === "rappi" ? null : v,
                    fecha: null,
                    competidor: null,
                    cat: null,
                    producto: null,
                    elegir: null,
                    en: null,
                  })
                }
                options={CANALES.map((x) => ({ value: x.value, label: x.label }))}
                className="w-fit"
              />
            </div>
            <div className="min-w-0 sm:w-44">
              <label htmlFor="fecha" className="label mb-1.5 block">
                Fecha del cruce
              </label>
              <Select
                id="fecha"
                label="Fecha del cruce"
                value={fecha ?? ""}
                onChange={(v) => poner({ fecha: v || null, elegir: null, en: null })}
                options={opcionesDeFecha}
                disabled={opcionesDeFecha.length <= 1}
              />
            </div>
          </div>
          <Segmented
            ariaLabel="Vista"
            value={vista}
            onChange={irAVista}
            options={[
              { value: "precios", label: "Precios" },
              { value: "revision", label: "Revisión", count: c ? hayPendientes : undefined },
            ]}
            className="w-fit"
          />
        </div>
        {fechas.data && fechas.data.dates.length === 0 && (
          <p className="mt-2 text-meta text-ink-3">
            Todavía no hay cruces guardados por día: se generan con el job diario.
          </p>
        )}
      </Contenedor>

      <Contenedor className="pt-6">
        {comparacion.isError ? (
          <ErrorEnLinea
            error={comparacion.error}
            onRetry={() => void comparacion.refetch()}
            recurso="la comparativa"
          />
        ) : comparacion.isLoading || !info ? (
          vista === "precios" ? (
            <EsqueletoDePrecios />
          ) : (
            <EsqueletoDeRevision />
          )
        ) : !c ? (
          <Panel>
            <EstadoVacio
              icon={Scale}
              titulo={
                fecha
                  ? `Ningún cruce guardado del ${fechaDeDia(fecha)}`
                  : canal === "cross"
                    ? `Todavía no hay cruce entre canales para ${label}`
                    : `Todavía no hay cruce para ${label} en ${NOMBRE_DE_CANAL[canal]}`
              }
              bajada="El cruce de productos corre una vez por día, a las 20:00 de Lima. Volvé después del job diario."
              acciones={
                fecha ? (
                  <Button onClick={() => poner({ fecha: null })}>Ver el cruce actual</Button>
                ) : undefined
              }
            />
          </Panel>
        ) : (
          <div className="space-y-4">
            {soloLectura && (
              <Notice
                tone="warn"
                title={`Cruce guardado del ${fechaDeDia(c.snapshotDate ?? fecha ?? "")}`}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => poner({ fecha: null, elegir: null, en: null })}
                  >
                    Ver el actual
                  </Button>
                }
              >
                Es el cruce de ese día, sin las decisiones manuales. No se edita.
              </Notice>
            )}
            {c.missingCompetitors.length > 0 && (
              <Notice tone="info">
                Sin catálogo de {c.missingCompetitors.join(", ")}: no entra en la comparación.
              </Notice>
            )}
            {vista === "precios" ? (
              <PreciosDeMarca
                comparacion={c}
                marca={info}
                canal={canal}
                fechas={fechas.data?.dates ?? []}
              />
            ) : (
              <RevisionDeMarca
                comparacion={c}
                marca={info}
                canal={canal}
                soloLectura={soloLectura}
              />
            )}
          </div>
        )}
      </Contenedor>

      <div className="h-16" />
    </>
  );
}
