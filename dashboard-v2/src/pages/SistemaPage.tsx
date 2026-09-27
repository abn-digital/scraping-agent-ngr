import { useState, type ReactNode } from "react";
import { Download, LayoutGrid, List, Plus, SearchX, Trash2 } from "lucide-react";
import { Metric, PageHeader } from "@/components/layout/PageHeader";
import { Avance, PasoDelBorrador } from "@/components/ui/Avance";
import { Avatar } from "@/components/ui/Avatar";
import { BarraDeInstruccion, type EstadoDeInstruccion } from "@/components/ui/BarraDeInstruccion";
import { BarraIndeterminada } from "@/components/ui/BarraIndeterminada";
import { Button } from "@/components/ui/Button";
import { CampoBusqueda } from "@/components/ui/CampoBusqueda";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Esqueleto } from "@/components/ui/Esqueleto";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Lamina } from "@/components/ui/Lamina";
import { Measure } from "@/components/ui/Measure";
import { MenuBoton } from "@/components/ui/MenuBoton";
import { NombreEditable } from "@/components/ui/NombreEditable";
import { Paginador } from "@/components/ui/Paginador";
import { Pulso } from "@/components/ui/Pulso";
import { RowMenu, RowMenuItem, RowMenuSeparator } from "@/components/ui/RowMenu";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";
import { Tooltip } from "@/components/ui/Tooltip";
import { ZonaDeArchivo } from "@/components/ui/ZonaDeArchivo";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/cn";
import { SistemaDatos } from "./SistemaDatos";

// La guía viva del sistema. Existe solo en desarrollo y muestra cada pieza con
// la regla que la gobierna: si algo nuevo no encaja en lo que hay acá, primero
// se discute si el sistema tiene que crecer, después se construye.

function Seccion({
  id,
  titulo,
  regla,
  children,
  oscuro,
}: {
  id: string;
  titulo: string;
  regla: ReactNode;
  children: ReactNode;
  oscuro?: boolean;
}) {
  return (
    <section id={id} className={cn("scroll-mt-6", oscuro && "stage-grid bg-stage")}>
      <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-10">
        <h2
          className={cn(
            "font-display text-h2 font-semibold tracking-[-.025em]",
            oscuro ? "text-stage-ink" : "text-ink",
          )}
        >
          {titulo}
        </h2>
        <p
          className={cn(
            "mt-2 max-w-[62ch] text-base leading-relaxed",
            oscuro ? "text-stage-3" : "text-ink-2",
          )}
        >
          {regla}
        </p>
        <div className="mt-9">{children}</div>
      </div>
    </section>
  );
}

function Muestra({ clase, nombre, uso }: { clase: string; nombre: string; uso: string }) {
  return (
    <li className="min-w-0">
      <span className={cn("block h-16 rounded-panel ring-1 ring-black/5", clase)} />
      <span className="mt-2 block font-mono text-micro text-ink-2">{nombre}</span>
      <span className="block text-meta leading-snug text-ink-3">{uso}</span>
    </li>
  );
}

const COLORES = [
  ["bg-paper", "paper", "El fondo. Hueso cálido: el blanco puro compite con lo que se muestra."],
  ["bg-paper-raised", "paper-raised", "Lo que se apoya encima: hojas, menús, tarjetas al pasar."],
  ["bg-paper-sunken", "paper-sunken", "Lo hundido: campos quietos, estados elegidos, hover suave."],
  ["bg-rule", "rule", "Reglas de 1px, casi nunca: una sombra corta separa mejor."],
  ["bg-ink", "ink", "El texto y el botón principal."],
  ["bg-ink-2", "ink-2", "Texto secundario, bajadas."],
  ["bg-ink-3", "ink-3", "Metadatos, etiquetas."],
  ["bg-ink-4", "ink-4", "Lo que casi no se lee: placeholders, íconos quietos."],
  ["bg-stage", "stage", "El escenario: donde el producto muestra lo suyo."],
  ["bg-stage-raised", "stage-raised", "Paneles y tooltips sobre el escenario."],
  ["bg-ember", "ember", "El único color de marca. Solo cuando algo pasa o está elegido."],
  ["bg-pass", "pass", "Salió bien."],
  ["bg-fail", "fail", "Falló. Sobre el escenario, fail-soft."],
  ["bg-warn", "warn", "Atención, sin alarma."],
] as const;

export default function SistemaPage() {
  const [seg, setSeg] = useState("todas");
  const [vista, setVista] = useState("grilla");
  const [pagina, setPagina] = useState(3);
  const [hoja, setHoja] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [q, setQ] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [nombre, setNombre] = useState("Campaña de verano");
  const [instruccion, setInstruccion] = useState<EstadoDeInstruccion>({ tipo: "libre" });

  // La muestra de la barra recorre sus estados sola: trabaja un momento y
  // termina bien, o falla si la instrucción dice "falla".
  const mandar = (texto: string) => {
    setInstruccion({ tipo: "trabajando", instruccion: texto });
    setTimeout(
      () =>
        setInstruccion(
          /falla/i.test(texto)
            ? { tipo: "error", error: "El modelo no pudo responder." }
            : { tipo: "lista" },
        ),
      1600,
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Guía viva"
        title="El sistema"
        lede="Cada pieza con la regla que la gobierna: lo que la v2 hereda de creativos, más los datos y los controles que suma."
        meta={
          <>
            <Metric label="Primitivas" value="28" />
            <Metric label="Registros" value="2" />
            <Metric label="Colores de marca" value="1" />
          </>
        }
      />

      <Seccion
        id="color"
        titulo="Color"
        regla="Dos registros y un solo color de marca. El papel para navegar y leer; el escenario para mostrar. Ember no decora: marca actividad o elección."
      >
        <ul className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 lg:grid-cols-7">
          {COLORES.map(([clase, n, uso]) => (
            <Muestra key={n} clase={clase} nombre={n} uso={uso} />
          ))}
        </ul>
      </Seccion>

      <Seccion
        id="tipografia"
        titulo="Tipografía"
        regla="Bricolage para titulares, Instrument Sans para todo lo demás, JetBrains Mono solo para valores: una cifra, una medida, un id. Las etiquetas van en minúscula y en la sans."
      >
        <div className="space-y-4">
          <p className="font-display text-display font-semibold text-ink">Display</p>
          <p className="font-display text-h1 font-semibold text-ink">Título de página</p>
          <p className="font-display text-h2 font-semibold text-ink">
            Título de pantalla de estado
          </p>
          <p className="font-display text-h3 font-semibold text-ink">
            Título de sección, hoja o fila
          </p>
          <p className="text-lede text-ink-2">
            La bajada: una línea que dice para qué sirve la pantalla.
          </p>
          <p className="text-base text-ink">El cuerpo de la interfaz.</p>
          <p className="text-meta text-ink-3">Metadatos · hace 3 min · 12 notas</p>
          <p className="label">Etiqueta de un dato</p>
          <p className="font-mono text-micro tnum text-ink-2">1080 × 1350 · a1b2c3d4e5</p>
        </div>
      </Seccion>

      <Seccion
        id="forma"
        titulo="Forma"
        regla="El marco se redondea, lo que se muestra no. Sin bordes para separar: una sombra corta y cálida."
      >
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["rounded-chip", "chip · 6"],
            ["rounded-control", "control · 10"],
            ["rounded-panel", "panel · 14"],
            ["rounded-sheet", "sheet · 20"],
          ].map(([c, n]) => (
            <div key={c}>
              <span
                className={cn("block h-20 w-20 border border-rule-strong bg-paper-raised", c)}
              />
              <span className="mt-2 block font-mono text-micro text-ink-3">{n}</span>
            </div>
          ))}
          {["shadow-card", "shadow-card-lift", "shadow-lift", "shadow-sheet"].map((s) => (
            <div key={s}>
              <span className={cn("block h-20 w-28 rounded-panel bg-paper-raised", s)} />
              <span className="mt-2 block font-mono text-micro text-ink-3">
                {s.replace("shadow-", "")}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        id="botones"
        titulo="Botones"
        regla="Uno primario por pantalla. Verbo y artículo: dice exactamente qué va a pasar. Mientras trabaja, gerundio con elipsis."
      >
        <div className="space-y-4">
          {(["primary", "outline", "quiet", "ghost", "danger", "link"] as const).map((v) => (
            <div key={v} className="flex flex-wrap items-center gap-3">
              <Button variant={v} size="sm">
                Guardar
              </Button>
              <Button variant={v}>Guardar los cambios</Button>
              <Button variant={v} size="lg">
                Crear la nota
              </Button>
              <Button variant={v} size="icon" aria-label="Agregar">
                <Plus className="h-4 w-4" strokeWidth={2} />
              </Button>
              <span className="font-mono text-micro text-ink-4">{v}</span>
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="primary" loading>
              Guardando…
            </Button>
            <Tooltip label="Se habilita cuando hay un cambio">
              <span>
                <Button variant="primary" disabled>
                  Deshabilitado
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </Seccion>

      <Seccion
        id="campos"
        titulo="Campos"
        regla="Etiqueta arriba, ayuda o error abajo, nunca los dos. El foco es ember y siempre se ve."
      >
        <div className="grid max-w-[760px] gap-6 md:grid-cols-2">
          <Field label="Nombre" htmlFor="s-nombre" hint="Así lo va a ver el equipo.">
            <Input id="s-nombre" defaultValue="Campaña de verano" />
          </Field>
          <Field label="Email" htmlFor="s-email" error="Ese email no parece válido">
            <Input id="s-email" defaultValue="juana@" aria-invalid />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descripción" htmlFor="s-desc">
              <Textarea id="s-desc" placeholder="¿Qué es?" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <CampoBusqueda
              value={q}
              onChange={setQ}
              placeholder="Buscar una nota"
              ariaLabel="Buscar"
            />
          </div>
          <div className="md:col-span-2">
            <ZonaDeArchivo
              file={file}
              onFile={setFile}
              accept="image/*"
              validar={() => null}
              invitacion="Zona para soltar un archivo"
              descripcion="Cualquier imagen · de muestra"
            />
          </div>
        </div>
      </Seccion>

      <Seccion
        id="elegir"
        titulo="Elegir y navegar"
        regla="Un segmentado elige entre pocas opciones; su indicador se desliza. El paginador muestra el rango: 21–40 de 312."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <Segmented
              ariaLabel="Filtro de muestra"
              value={seg}
              onChange={setSeg}
              options={[
                { value: "todas", label: "Todas", count: 128 },
                { value: "curso", label: "En curso", count: 3 },
                { value: "listas", label: "Listas", count: 125 },
              ]}
            />
            <Segmented
              ariaLabel="Vista de muestra"
              size="sm"
              value={vista}
              onChange={setVista}
              options={[
                { value: "grilla", label: "Grilla", icon: LayoutGrid },
                { value: "lista", label: "Lista", icon: List },
              ]}
            />
          </div>
          <Paginador
            pagina={pagina}
            total={312}
            porPagina={20}
            onPagina={setPagina}
            etiqueta="Páginas de muestra"
          />
          <Stepper
            current={2}
            onGo={() => {}}
            steps={[
              { n: 1, title: "Datos", hint: "Nombre y cliente", blockedBy: null },
              { n: 2, title: "Contenido", hint: "Lo que se publica", blockedBy: null },
              { n: 3, title: "Revisión", hint: "Antes de enviar", blockedBy: "Falta el contenido" },
            ]}
          />
        </div>
      </Seccion>

      <Seccion
        id="estados"
        titulo="Estados"
        regla="Lo que carga copia la geometría de lo que va a llegar. Lo que trabaja late en ember. Lo vacío dice qué falta y ofrece la acción."
      >
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-3">
            <Esqueleto className="h-5 w-2/3" />
            <Esqueleto className="h-3 w-1/3" />
            <Esqueleto className="h-24 w-full" />
          </div>
          <div className="space-y-4">
            <Pulso estado="en-curso">Resumiendo</Pulso>
            <br />
            <Pulso estado="fallo">No se pudo resumir</Pulso>
            <br />
            <Pulso estado="listo">Listo</Pulso>
            <BarraIndeterminada className="max-w-[320px]" />
            <div className="flex flex-wrap gap-2">
              {(["neutral", "muted", "pass", "fail", "warn", "ember"] as const).map((t) => (
                <Chip key={t} tone={t}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <EstadoVacio
              icon={SearchX}
              titulo="No se encontraron notas con"
              consulta="presupuesto"
              acciones={<Button variant="quiet">Limpiar la búsqueda</Button>}
            />
          </div>
        </div>
      </Seccion>

      <Seccion
        id="lotes"
        titulo="Trabajo que tarda"
        regla="Un lote muestra cuánto va, cuántos fallaron y cuántos faltan, igual en la lista y en el detalle. La casilla del estado está siempre, ocupe o no: la fila no cambia de alto al pausar. Un armado a medias dice en qué paso quedó."
      >
        <div className="grid gap-10 md:grid-cols-2">
          <div className="space-y-6">
            <Avance total={30} listos={18} fallidos={2} estado="corriendo" />
            <Avance total={30} listos={11} fallidos={0} estado="pausado" />
            <Avance total={30} listos={30} fallidos={0} estado="terminado" />
            <PasoDelBorrador paso={3} de={4} />
          </div>
          <Avance total={120} listos={84} fallidos={6} estado="corriendo" grande />
        </div>
      </Seccion>

      <Seccion
        id="deshacer"
        titulo="Deshacer"
        regla="Lo que se puede deshacer no pregunta antes: avisa y ofrece Deshacer. La confirmación queda para lo que no tiene vuelta. Irse con cambios sin guardar siempre pregunta."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="quiet"
            onClick={() =>
              aviso.ok("Se movió a Archivo", {
                action: { label: "Deshacer", onClick: () => aviso.info("Volvió a donde estaba.") },
              })
            }
          >
            Aviso con Deshacer
          </Button>
        </div>
      </Seccion>

      <Seccion
        id="capas"
        titulo="Lo que se abre"
        regla="Todo lo que flota usa shadow-sheet. Abrir se anuncia (0,24 s, sube 8 px); cerrar no se espera (0,16 s). Los avisos son hojas de papel y no pasan de tres."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setHoja(true)}>Abrir una hoja</Button>
          <Button variant="danger" onClick={() => setConfirmar(true)}>
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            Confirmar un borrado
          </Button>
          <Button variant="quiet" onClick={() => aviso.ok("Guardada.")}>
            Aviso bien
          </Button>
          <Button variant="quiet" onClick={() => aviso.error("No se pudo completar la acción")}>
            Aviso mal
          </Button>
          <Tooltip label="Achicar el riel" shortcut="[">
            <Button variant="ghost">Tooltip con atajo</Button>
          </Tooltip>
          <div className="group flex items-center gap-3 rounded-panel bg-paper-raised px-4 py-2 shadow-card">
            <NombreEditable nombre={nombre} onRename={setNombre}>
              <span className="text-base text-ink">{nombre}</span>
            </NombreEditable>
            <RowMenu label="Opciones de muestra">
              <RowMenuItem onSelect={() => {}}>Duplicar</RowMenuItem>
              <RowMenuSeparator />
              <RowMenuItem danger onSelect={() => {}}>
                Eliminar
              </RowMenuItem>
            </RowMenu>
          </div>
          <Avatar nombre="Juana Pérez" />
          <MenuBoton
            etiqueta="Descargar"
            icono={Download}
            opciones={[
              { valor: "completa", nombre: "Completa" },
              { valor: "chica", nombre: "Chica" },
            ]}
            onElegir={(v) => aviso.info(`Era una muestra: bajaría la ${v}.`)}
          />
        </div>
      </Seccion>

      <Seccion
        id="escenario"
        oscuro
        titulo="El escenario"
        regla="Grafito frío para que lo único cálido sea lo que se muestra. Todo lo que se apoya encima cambia de registro por prop: tone=dark, dark, oscuro."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button tone="dark" variant="primary">
            Abrir
          </Button>
          <Button tone="dark" variant="outline">
            Ver todo
          </Button>
          <Button tone="dark" variant="ghost">
            Volver
          </Button>
          <Chip dark tone="ember">
            generando
          </Chip>
          <Chip dark tone="pass">
            lista
          </Chip>
          <Pulso estado="en-curso">Resumiendo</Pulso>
        </div>
        <div className="mt-8 grid max-w-[520px] gap-4">
          <Esqueleto oscuro className="h-4 w-2/3" />
          <BarraIndeterminada oscuro />
          <Measure dark>1080 × 1350</Measure>
        </div>
        <div className="mt-10 flex gap-6">
          <span className="block h-40 w-32 bg-paper shadow-piece" />
          <span className="block h-40 w-32 bg-ember shadow-piece-lift" />
        </div>

        <p className="label mt-12 text-stage-3">Láminas: lista, vacía, trabajando</p>
        <div className="mt-4 grid max-w-[720px] grid-cols-3 gap-6">
          <Lamina ancho={4} alto={5} alt="Una lámina lista">
            <span className="block h-full w-full bg-ember/80" />
          </Lamina>
          <Lamina ancho={4} alto={5} alt="Una lámina vacía" estado="vacia" />
          <Lamina ancho={4} alto={5} alt="Una lámina trabajando" estado="trabajando">
            <span className="block h-full w-full bg-paper/40" />
          </Lamina>
        </div>

        <div className="mt-10 flex items-center gap-3">
          <MenuBoton
            tone="dark"
            etiqueta="Exportar"
            icono={Download}
            opciones={[
              { valor: "png", nombre: "PNG" },
              { valor: "webp", nombre: "WebP" },
            ]}
            onElegir={(v) => aviso.info(`Era una muestra: exportaría en ${v.toUpperCase()}.`)}
          />
        </div>

        <p className="label mt-12 text-stage-3">
          Pedirle algo a la IA (una instrucción con "falla" muestra el error)
        </p>
        <div className="mt-4 max-w-[860px]">
          <BarraDeInstruccion
            estado={instruccion}
            etiqueta="Pedir una versión nueva"
            placeholder="¿Qué cambiarías?"
            mensajeListo="Lista. Es la versión vigente."
            onMandar={mandar}
            onReintentar={() => setInstruccion({ tipo: "libre" })}
            onDescartar={() => setInstruccion({ tipo: "libre" })}
          />
        </div>
      </Seccion>

      <SistemaDatos />

      <Sheet
        open={hoja}
        onOpenChange={setHoja}
        title="Una hoja"
        description="Título en display, cuerpo con scroll propio y pie en papel."
        footer={
          <>
            <Button variant="ghost" onClick={() => setHoja(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => setHoja(false)}>
              Guardar
            </Button>
          </>
        }
      >
        <Field label="Nombre" htmlFor="s-hoja">
          <Input id="s-hoja" defaultValue="Campaña de verano" />
        </Field>
      </Sheet>

      <ConfirmDialog
        open={confirmar}
        onOpenChange={setConfirmar}
        title={'¿Eliminar "Campaña de verano"?'}
        description="Se borra para todo el equipo. No se puede deshacer."
        onConfirm={() => aviso.info("Era una muestra: no se borró nada.")}
      />
    </>
  );
}
