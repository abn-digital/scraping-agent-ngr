import { useEffect, useState } from 'react';

// Cómo funciona la herramienta, al lado del login: leer los canales, armar el
// catálogo, comparar y revisar. Es una maqueta de bloques, no capturas reales.
// Da vueltas sola hasta que la persona toca un paso; con movimiento reducido
// se queda quieta en la comparativa. Misma idea que el login de la v2, con la
// estética de la v1 y animaciones en CSS (index.css).

export const ESCENAS = [
  { titulo: 'Leemos los tres canales', texto: 'Cada noche se leen los catálogos de las seis marcas.' },
  { titulo: 'Armamos el catálogo', texto: 'Producto, categoría y precio, local por local.' },
  { titulo: 'Comparamos', texto: 'El mismo producto, lado a lado, en el canal que elijas.' },
  { titulo: 'Revisamos lo dudoso', texto: 'La IA propone el equivalente; una persona lo confirma.' },
] as const;

export const MS_POR_ESCENA = 2500;
const QUIETA = 2;

const prefiereQuieto = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function AnimacionLogin({ compacta = false }: { compacta?: boolean }) {
  const [quieto] = useState(prefiereQuieto);
  const [paso, setPaso] = useState(0);
  const [manual, setManual] = useState(false);
  const actual = quieto && !manual ? QUIETA : paso;

  useEffect(() => {
    if (manual || quieto) return;
    const t = window.setTimeout(() => setPaso((p) => (p + 1) % ESCENAS.length), MS_POR_ESCENA);
    return () => window.clearTimeout(t);
  }, [paso, manual, quieto]);

  return (
    <div className={`relative w-full ${compacta ? 'h-full flex flex-col justify-center gap-1' : 'max-w-[460px] space-y-8'}`}>
      <div className={`flex items-center justify-center ${compacta ? 'h-[150px]' : 'h-[300px]'}`} aria-hidden>
        {/* La key reemplaza la escena entera y dispara su entrada. */}
        <div key={actual} className={`w-full animate-escena motion-reduce:animate-none ${compacta ? 'max-w-[440px] scale-[.55]' : ''}`}>
          {actual === 0 ? <Canales /> : actual === 1 ? <Catalogo /> : actual === 2 ? <Comparativa /> : <Revision />}
        </div>
      </div>

      <div className={compacta ? 'text-center px-5' : ''}>
        <p className="text-sm font-bold text-white" data-testid="escena-actual" aria-live={manual ? 'polite' : 'off'}>
          {ESCENAS[actual].titulo}
        </p>
        {!compacta && (
          <>
            <p className="mt-1 min-h-[2.5em] text-sm text-slate-400">{ESCENAS[actual].texto}</p>
            <ol className="mt-4 flex gap-1.5" aria-label="Pasos de cómo funciona">
              {ESCENAS.map((e, i) => (
                <li key={e.titulo} className="flex-1">
                  <button
                    type="button"
                    onClick={() => { setManual(true); setPaso(i); }}
                    aria-current={i === actual ? 'step' : undefined}
                    aria-label={`${i + 1}. ${e.titulo}`}
                    className="group block w-full py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 rounded"
                  >
                    <span className={`block h-[3px] rounded-full transition-colors duration-150 ${
                      i === actual ? 'bg-accent' : 'bg-white/15 group-hover:bg-white/30'
                    }`} />
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

const Bloque = ({ className = '' }: { className?: string }) => (
  <span className={`block h-2 rounded-sm bg-white/10 ${className}`} />
);

const TARJETA = 'bg-slate-950/60 rounded-xl ring-1 ring-white/10 shadow-xl';

// 1. Tres catálogos que se leen a la vez: una franja roja los recorre.
function Canales() {
  return (
    <div className="grid grid-cols-3 gap-5">
      {['Rappi', 'PedidosYa', 'Sitio propio'].map((canal) => (
        <div key={canal} className="flex flex-col items-center gap-3">
          <div className={`relative w-full aspect-[3/4] overflow-hidden ${TARJETA}`}>
            <div className="flex h-full flex-col gap-2.5 p-3 opacity-50">
              <Bloque className="h-3 w-2/3 bg-white/20" />
              {[0, 1, 2, 3, 4].map((i) => <Bloque key={i} className="w-full" />)}
            </div>
            <div className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
              <div className="h-[9%] w-full animate-barrido bg-gradient-to-b from-transparent via-accent/40 to-transparent" />
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400">{canal}</span>
        </div>
      ))}
    </div>
  );
}

const PRODUCTOS = [
  { w: 'w-[62%]', precio: 'S/ 18.90' },
  { w: 'w-[48%]', precio: 'S/ 12.50' },
  { w: 'w-[70%]', precio: 'S/ 24.90' },
  { w: 'w-[40%]', precio: 'S/ 7.90' },
  { w: 'w-[56%]', precio: 'S/ 15.40' },
  { w: 'w-[44%]', precio: 'S/ 9.90' },
];

// 2. Las filas del catálogo entran escalonadas.
function Catalogo() {
  return (
    <div className={`p-4 ${TARJETA}`}>
      <Bloque className="mb-4 h-2.5 w-24 bg-white/20" />
      <ul className="space-y-1">
        {PRODUCTOS.map((p, i) => (
          <li key={i} className="flex items-center gap-4 border-b border-white/5 py-2 animate-fila motion-reduce:animate-none"
              style={{ animationDelay: `${Math.min(i * 0.035, 0.21)}s` }}>
            <Bloque className={p.w} />
            <span className="ml-auto font-mono text-xs font-bold text-white tabular-nums">{p.precio}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const COMPARADOS = [
  { w: 'w-[70%]', ngr: 'S/ 18.90', otro: 'S/ 17.40', delta: '+ S/ 1.50', cls: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
  { w: 'w-[52%]', ngr: 'S/ 12.50', otro: 'S/ 13.30', delta: '− S/ 0.80', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  { w: 'w-[62%]', ngr: 'S/ 24.90', otro: 'S/ 24.90', delta: 'S/ 0.00', cls: 'bg-white/5 text-slate-400 ring-white/10' },
  { w: 'w-[44%]', ngr: 'S/ 9.90', otro: 'S/ 10.60', delta: '− S/ 0.70', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
];

// 3. NGR contra un competidor: la diferencia aparece después del precio.
function Comparativa() {
  const grilla = 'grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_5.5rem] items-center gap-3';
  return (
    <div className={`p-4 ${TARJETA}`}>
      <div className={`${grilla} pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500`}>
        <span />
        <span className="text-right">NGR</span>
        <span className="text-right">Competidor</span>
        <span className="text-right">Diferencia</span>
      </div>
      {COMPARADOS.map((f, i) => (
        <div key={i} className={`${grilla} border-t border-white/5 py-2.5`}>
          <Bloque className={f.w} />
          <span className="text-right font-mono text-xs font-bold text-white tabular-nums">{f.ngr}</span>
          <span className="text-right font-mono text-xs text-slate-400 tabular-nums">{f.otro}</span>
          <span className="flex justify-end animate-chip motion-reduce:animate-none" style={{ animationDelay: `${0.35 + i * 0.12}s` }}>
            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ring-1 tabular-nums ${f.cls}`}>{f.delta}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// 4. Un match con puntaje bajo: la IA propone, "Confirmar" se enciende.
function Revision() {
  const fila = (puntaje: string, w: string) => (
    <div className={`p-4 opacity-50 ${TARJETA}`}>
      <div className="flex items-center gap-3">
        <Bloque className={w} />
        <span className="ml-auto font-mono text-[10px] text-slate-400">{puntaje}</span>
        <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/30">Auto</span>
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {fila('94', 'w-[45%]')}
      <div className={`p-4 ${TARJETA}`}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Bloque className="w-[60%] bg-white/20" />
            <Bloque className="w-[38%]" />
          </div>
          <span className="font-mono text-[10px] text-slate-400">62</span>
          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30">Revisar</span>
        </div>
        <div className="mt-4 flex justify-end gap-2 text-[11px] font-bold">
          <span className="rounded-lg px-2.5 py-1.5 text-slate-400 ring-1 ring-white/10">Elegir otro</span>
          <span className="relative overflow-hidden rounded-lg bg-white/5 px-2.5 py-1.5 text-white">
            <span className="absolute inset-0 bg-accent animate-encender motion-reduce:animate-none" aria-hidden />
            <span className="relative">Confirmar</span>
          </span>
        </div>
      </div>
      {fila('88', 'w-[52%]')}
    </div>
  );
}
