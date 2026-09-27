import { useState, type ReactNode } from "react";
import { Barras } from "@/components/datos/Barras";
import { Cifra } from "@/components/datos/Cifra";
import { Columnas } from "@/components/datos/Columnas";
import { Lineas } from "@/components/datos/Lineas";
import { Proporcion } from "@/components/datos/Proporcion";
import { Notice } from "@/components/ui/Notice";
import { Panel } from "@/components/ui/Panel";
import { Select } from "@/components/ui/Select";
import { SelectorMultiple } from "@/components/ui/SelectorMultiple";
import { Switch } from "@/components/ui/Switch";
import { Tabla, ordenar, type Orden } from "@/components/ui/Tabla";
import { cn } from "@/lib/cn";
import {
  colorDeSerie,
  coloresPorEntidad,
  compacto,
  moneda,
  numero,
  SENTIMIENTO,
} from "@/lib/datos";

// Lo que la v2 le suma al sistema de creativos: las piezas de datos (los
// tableros de social-listener, los precios de scraping-agent, las métricas de
// ugc-flow) y los controles que creative-check ya había agregado.

function Seccion({
  id,
  titulo,
  regla,
  children,
}: {
  id: string;
  titulo: string;
  regla: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
        <h2 className="font-display text-h2 font-semibold tracking-[-.025em] text-ink">{titulo}</h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-ink-2">{regla}</p>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

const MARCAS = [
  "Bembos",
  "Popeyes",
  "Papa John's",
  "Chinawok",
  "Don Belisario",
  "Madam Tusan",
  "Otras",
];
const DIAS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2026, 7, 29 + i);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" }).replace(".", "");
});
const serie = (base: number, amp: number, fase: number) =>
  DIAS.map((_, i) => Math.round(base + amp * Math.sin(i / 4 + fase) + ((i * 7 + fase * 13) % 9)));

interface Producto {
  id: string;
  nombre: string;
  propio: number;
  rappi: number | null;
  peya: number | null;
}
const PRODUCTOS: Producto[] = [
  { id: "1", nombre: "Combo Clásica", propio: 21.9, rappi: 24.9, peya: 23.5 },
  { id: "2", nombre: "Hamburguesa Royal", propio: 17.9, rappi: 19.9, peya: null },
  { id: "3", nombre: "Papas familiares", propio: 12.5, rappi: 13.9, peya: 13.5 },
  { id: "4", nombre: "Pollo 8 piezas", propio: 49.9, rappi: 55.9, peya: 54.9 },
];

export function SistemaDatos() {
  const [marcas, setMarcas] = useState<string[]>([]);
  const [plataforma, setPlataforma] = useState<"" | "instagram" | "tiktok">("");
  const [avisar, setAvisar] = useState(true);
  const [orden, setOrden] = useState<Orden>({ columna: "propio", sentido: "desc" });
  const colores = coloresPorEntidad(MARCAS);

  const series = MARCAS.slice(0, 4)
    .filter((m) => marcas.length === 0 || marcas.includes(m))
    .map((m, i) => ({
      id: m,
      etiqueta: m,
      color: colores.get(m)!,
      valores: serie(120 + i * 40, 30 + i * 6, i),
    }));

  return (
    <>
      <Seccion
        id="datos"
        titulo="Datos"
        regla="Los gráficos se apoyan en un Panel de papel levantado. Seis colores de serie validados contra daltonismo, asignados por entidad y nunca reciclados; la séptima serie va en gris como Otras. Ember marca lo elegido; pass y fail, solo estados como el sentimiento."
      >
        <div className="grid gap-5 md:grid-cols-4">
          <Panel>
            <Cifra
              etiqueta="Comentarios"
              valor={compacto(12908)}
              delta={0.12}
              contra="vs. los 30 días anteriores"
              tendencia={serie(40, 10, 1).slice(-12)}
            />
          </Panel>
          <Panel>
            <Cifra
              etiqueta="Sentimiento negativo"
              valor="18 %"
              delta={-0.04}
              mejorSiBaja
              contra="vs. mes anterior"
            />
          </Panel>
          <Panel>
            <Cifra etiqueta="Precio promedio" valor={moneda(21.9)} detalle="4 productos" />
          </Panel>
          <Panel oscuro>
            <Cifra oscuro etiqueta="Última corrida" valor="hace 2 h" detalle="148 productos" />
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel
            titulo="Menciones por marca"
            bajada="Últimos 30 días"
            acciones={
              <SelectorMultiple
                valores={marcas}
                onChange={setMarcas}
                nombre="marca"
                nombrePlural="marcas"
                size="sm"
                opciones={MARCAS.slice(0, 4).map((m) => ({
                  value: m,
                  label: m,
                  marca: (
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full"
                      style={{ background: colores.get(m) }}
                    />
                  ),
                }))}
              />
            }
          >
            <Lineas titulo="Menciones por marca" etiquetasX={DIAS} series={series} alternables />
          </Panel>
          <Panel titulo="Sentimiento" bajada="2.418 comentarios">
            <Proporcion
              titulo="Sentimiento de los comentarios"
              partes={[
                {
                  id: "pos",
                  etiqueta: SENTIMIENTO.positivo.etiqueta,
                  valor: 1420,
                  color: SENTIMIENTO.positivo.papel,
                },
                {
                  id: "neu",
                  etiqueta: SENTIMIENTO.neutral.etiqueta,
                  valor: 562,
                  color: SENTIMIENTO.neutral.papel,
                },
                {
                  id: "neg",
                  etiqueta: SENTIMIENTO.negativo.etiqueta,
                  valor: 436,
                  color: SENTIMIENTO.negativo.papel,
                },
              ]}
            />
            <p className="label mb-3 mt-8">Share de voz</p>
            <Barras
              titulo="Share de voz"
              destacado="Bembos"
              barras={MARCAS.slice(0, 5).map((m, i) => ({
                id: m,
                etiqueta: m,
                valor: 900 - i * 140,
              }))}
            />
          </Panel>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Panel titulo="Comentarios por día" bajada="Apiladas por sentimiento">
            <Columnas
              titulo="Comentarios por día"
              apiladas
              categorias={DIAS.slice(-14)}
              series={[
                {
                  id: "pos",
                  etiqueta: "Positivo",
                  color: SENTIMIENTO.positivo.papel,
                  valores: serie(40, 12, 0).slice(-14),
                },
                {
                  id: "neu",
                  etiqueta: "Neutral",
                  color: SENTIMIENTO.neutral.papel,
                  valores: serie(18, 6, 2).slice(-14),
                },
                {
                  id: "neg",
                  etiqueta: "Negativo",
                  color: SENTIMIENTO.negativo.papel,
                  valores: serie(12, 5, 4).slice(-14),
                },
              ]}
            />
          </Panel>
          <Panel titulo="Precios" bajada="Propio contra delivery" plano>
            <Tabla
              etiqueta="Precios por canal"
              columnas={[
                {
                  id: "nombre",
                  titulo: "Producto",
                  celda: (p: Producto) => <span className="text-ink">{p.nombre}</span>,
                  ordenable: true,
                },
                {
                  id: "propio",
                  titulo: "Propio",
                  celda: (p: Producto) => moneda(p.propio),
                  numerica: true,
                  ordenable: true,
                },
                {
                  id: "rappi",
                  titulo: "Rappi",
                  celda: (p: Producto) => moneda(p.rappi),
                  numerica: true,
                  ordenable: true,
                },
                {
                  id: "peya",
                  titulo: "PedidosYa",
                  celda: (p: Producto) => moneda(p.peya),
                  numerica: true,
                  ordenable: true,
                  secundaria: true,
                },
              ]}
              filas={ordenar(
                PRODUCTOS,
                orden,
                (p, c) => p[c as keyof Producto] as number | string | null,
              )}
              clave={(p) => p.id}
              orden={orden}
              onOrden={setOrden}
            />
          </Panel>
        </div>

        <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-2">
          {MARCAS.map((m, i) => (
            <li key={m} className="flex items-center gap-2 text-meta text-ink-2">
              <span
                aria-hidden
                className={cn("h-3 w-6 rounded-[3px]")}
                style={{ background: colorDeSerie(i) }}
              />
              <span className="font-mono text-micro">{i < 6 ? `dato-${i + 1}` : "ink-4"}</span> {m}
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion
        id="controles"
        titulo="Controles de creative-check"
        regla="Un select propio (la lista es un panel de grafito, como todo lo que se elige), el interruptor, el aviso en línea y el selector de varias opciones, donde vacío es todas."
      >
        <div className="grid max-w-[860px] gap-6 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="s-plataforma" className="label block text-ink-2">
              Plataforma
            </label>
            <Select
              id="s-plataforma"
              label="Plataforma"
              value={plataforma}
              onChange={setPlataforma}
              placeholder="Todas las plataformas"
              options={[
                { value: "instagram", label: "Instagram" },
                { value: "tiktok", label: "TikTok", hint: "Comentarios y hashtags" },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-panel bg-paper-raised px-4 py-3 shadow-card">
            <span>
              <span className="block text-base text-ink">Avisar por Slack</span>
              <span className="block text-meta text-ink-3">Cuando el negativo pasa el 30 %.</span>
            </span>
            <Switch checked={avisar} onChange={setAvisar} label="Avisar por Slack" />
          </div>
          <Notice tone="warn" title="Faltan datos de TikTok">
            La última corrida no trajo comentarios. Los números de TikTok son de hace {numero(3)}{" "}
            días.
          </Notice>
          <Notice tone="info">El informe se arma con los filtros de arriba.</Notice>
        </div>
      </Seccion>
    </>
  );
}
