import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Lamina } from "@/components/ui/Lamina";
import { cn } from "@/lib/cn";

// Cómo funciona la herramienta, en el escenario del login: leer los canales,
// armar el catálogo, comparar y revisar. Es una maqueta de bloques, como la
// escena de `Recorrido`: no promete un resultado concreto. Da vueltas sola
// hasta que la persona toca un paso; con movimiento reducido se queda quieta
// en la comparativa, que es lo que la herramienta muestra.

export const ESCENAS = [
  {
    titulo: "Leemos los tres canales",
    texto: "Cada noche se leen los catálogos de las seis marcas.",
  },
  { titulo: "Armamos el catálogo", texto: "Producto, categoría y precio, local por local." },
  { titulo: "Comparamos", texto: "El mismo producto, lado a lado, en el canal que elijas." },
  {
    titulo: "Revisamos lo dudoso",
    texto: "La IA propone el equivalente; una persona lo confirma.",
  },
] as const;

export const MS_POR_ESCENA = 2500;
const QUIETA = 2;
const CURVA = [0.16, 1, 0.3, 1] as const;

export function AnimacionDeLaHerramienta({ compacta = false }: { compacta?: boolean }) {
  const quieto = useReducedMotion() ?? false;
  const [paso, setPaso] = useState(0);
  const [manual, setManual] = useState(false);
  const actual = quieto && !manual ? QUIETA : paso;

  useEffect(() => {
    if (manual || quieto) return;
    const t = window.setTimeout(() => setPaso((p) => (p + 1) % ESCENAS.length), MS_POR_ESCENA);
    return () => window.clearTimeout(t);
  }, [paso, manual, quieto]);

  const elegir = (n: number) => {
    setManual(true);
    setPaso(n);
  };

  return (
    <div
      className={cn(
        "relative z-[1] flex w-full flex-col",
        compacta ? "h-full justify-center gap-1" : "max-w-[460px] gap-8",
      )}
    >
      <div
        className={cn("flex items-center justify-center", compacta ? "h-[150px]" : "h-[300px]")}
        aria-hidden
      >
        {/* Sin AnimatePresence: con clicks rápidos deja el panel vacío.
            Cambiar la key alcanza para animar el reemplazo. */}
        <motion.div
          key={actual}
          initial={quieto ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: CURVA }}
          className={cn("w-full", compacta && "max-w-[440px] origin-center scale-[.55]")}
        >
          <Escena n={actual} quieto={quieto} />
        </motion.div>
      </div>

      <div className={cn(compacta && "px-5 text-center")}>
        <p
          className="text-base font-medium text-stage-ink"
          aria-live={manual ? "polite" : "off"}
          data-testid="escena-actual"
        >
          {ESCENAS[actual]!.titulo}
        </p>
        {!compacta && (
          <>
            <p className="mt-1 min-h-[3em] text-meta text-stage-3">{ESCENAS[actual]!.texto}</p>
            <ol className="mt-4 flex gap-1.5" aria-label="Pasos de cómo funciona">
              {ESCENAS.map((e, i) => (
                <li key={e.titulo} className="flex-1">
                  <button
                    type="button"
                    onClick={() => elegir(i)}
                    aria-current={i === actual ? "step" : undefined}
                    aria-label={`${i + 1}. ${e.titulo}`}
                    className="group block w-full py-2"
                  >
                    <span
                      className={cn(
                        "block h-[3px] rounded-full transition-colors duration-150",
                        i === actual ? "bg-ember" : "bg-white/15 group-hover:bg-white/30",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Escena({ n, quieto }: { n: number; quieto: boolean }) {
  if (n === 0) return <Canales />;
  if (n === 1) return <Catalogo quieto={quieto} />;
  if (n === 2) return <Comparativa quieto={quieto} />;
  return <Revision quieto={quieto} />;
}

const Bloque = ({ className }: { className?: string }) => (
  <span className={cn("block h-2 rounded-[2px] bg-white/[.09]", className)} />
);

// 1. Tres catálogos que se leen a la vez: la franja ember de Lamina trabajando.
function Canales() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {["Rappi", "PedidosYa", "Sitio propio"].map((canal) => (
        <div key={canal} className="flex flex-col items-center gap-3">
          <Lamina ancho={3} alto={4} alt="" estado="trabajando" className="w-full">
            <div className="flex h-full flex-col gap-2.5 p-3 opacity-60">
              <Bloque className="h-3 w-2/3 bg-white/[.14]" />
              {[0, 1, 2, 3, 4].map((i) => (
                <Bloque key={i} className="w-full" />
              ))}
            </div>
          </Lamina>
          <span className="text-meta text-stage-3">{canal}</span>
        </div>
      ))}
    </div>
  );
}

const PRODUCTOS = [
  { w: "w-[62%]", precio: "S/ 18,90" },
  { w: "w-[48%]", precio: "S/ 12,50" },
  { w: "w-[70%]", precio: "S/ 24,90" },
  { w: "w-[40%]", precio: "S/ 7,90" },
  { w: "w-[56%]", precio: "S/ 15,40" },
  { w: "w-[44%]", precio: "S/ 9,90" },
];

// 2. Las filas del catálogo entran escalonadas, como una lista del sistema.
function Catalogo({ quieto }: { quieto: boolean }) {
  return (
    <div className="bg-stage-deep p-4 shadow-piece ring-1 ring-white/10">
      <Bloque className="mb-4 h-2.5 w-24 bg-white/[.14]" />
      <ul className="space-y-1">
        {PRODUCTOS.map((p, i) => (
          <motion.li
            key={i}
            initial={quieto ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: Math.min(i * 0.035, 0.21), ease: CURVA }}
            className="flex items-center gap-4 border-b border-white/[.06] py-2"
          >
            <Bloque className={p.w} />
            <span className="ml-auto font-mono text-meta text-stage-ink tnum">{p.precio}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

const COMPARADOS = [
  { w: "w-[70%]", ngr: "S/ 18,90", otro: "S/ 17,40", delta: "+ S/ 1,50", tono: "fail" as const },
  { w: "w-[52%]", ngr: "S/ 12,50", otro: "S/ 13,30", delta: "− S/ 0,80", tono: "pass" as const },
  { w: "w-[62%]", ngr: "S/ 24,90", otro: "S/ 24,90", delta: "S/ 0,00", tono: "muted" as const },
  { w: "w-[44%]", ngr: "S/ 9,90", otro: "S/ 10,60", delta: "− S/ 0,70", tono: "pass" as const },
];

// 3. NGR contra un competidor: el delta aparece después del precio.
function Comparativa({ quieto }: { quieto: boolean }) {
  return (
    <div className="bg-stage-deep p-4 shadow-piece ring-1 ring-white/10">
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5.5rem] gap-3 pb-3 text-micro text-stage-3">
        <span />
        <span className="text-right">NGR</span>
        <span className="text-right">Competidor</span>
        <span className="text-right">Diferencia</span>
      </div>
      {COMPARADOS.map((f, i) => (
        <div
          key={i}
          className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5.5rem] items-center gap-3 border-t border-white/[.06] py-2.5"
        >
          <Bloque className={f.w} />
          <span className="text-right font-mono text-meta text-stage-ink tnum">{f.ngr}</span>
          <span className="text-right font-mono text-meta text-stage-3 tnum">{f.otro}</span>
          <motion.span
            initial={quieto ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.24, delay: 0.35 + i * 0.12, ease: CURVA }}
            className="flex justify-end text-micro"
          >
            <Chip dark mono tone={f.tono}>
              {f.delta}
            </Chip>
          </motion.span>
        </div>
      ))}
    </div>
  );
}

// 4. Un cruce con puntaje bajo: la IA propone, "Confirmar" se enciende.
function Revision({ quieto }: { quieto: boolean }) {
  return (
    <div className="space-y-3">
      <div className="bg-stage-deep p-4 opacity-50 shadow-piece ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Bloque className="w-[45%]" />
          <span className="ml-auto font-mono text-micro text-stage-3 tnum">94</span>
          <Chip dark tone="pass" className="text-micro">
            Auto
          </Chip>
        </div>
      </div>
      <div className="bg-stage-deep p-4 shadow-piece ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Bloque className="w-[60%] bg-white/[.14]" />
            <Bloque className="w-[38%]" />
          </div>
          <span className="font-mono text-micro text-stage-3 tnum">62</span>
          <Chip dark tone="warn" className="text-micro">
            A revisar
          </Chip>
        </div>
        <div className="mt-4 flex justify-end gap-2 text-micro">
          <span className="rounded-control border border-stage-rule px-2.5 py-1.5 text-stage-3">
            Elegir otro
          </span>
          <span className="relative overflow-hidden rounded-control bg-white/[.06] px-2.5 py-1.5 font-medium text-stage-ink">
            <motion.span
              aria-hidden
              initial={quieto ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 1.1, ease: CURVA }}
              className="absolute inset-0 bg-ember"
            />
            <span className="relative">Confirmar</span>
          </span>
        </div>
      </div>
      <div className="bg-stage-deep p-4 opacity-50 shadow-piece ring-1 ring-white/10">
        <div className="flex items-center gap-3">
          <Bloque className="w-[52%]" />
          <span className="ml-auto font-mono text-micro text-stage-3 tnum">88</span>
          <Chip dark tone="pass" className="text-micro">
            Auto
          </Chip>
        </div>
      </div>
    </div>
  );
}
