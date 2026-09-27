import { Esqueleto } from "./Esqueleto";

/**
 * Lo que ocupa una `Tabla` mientras carga: el encabezado y las filas con su
 * alto real (py-3 y una línea de texto), para que al llegar los datos nada se
 * mueva. `columnas` son los anchos relativos de cada columna.
 */
export function EsqueletoDeTabla({
  filas = 8,
  columnas = [3, 1, 1],
}: {
  filas?: number;
  columnas?: number[];
}) {
  const plantilla = columnas.map((c) => `${c}fr`).join(" ");
  return (
    <div aria-hidden>
      <div
        className="grid gap-6 border-b border-rule px-5 py-3"
        style={{ gridTemplateColumns: plantilla }}
      >
        {columnas.map((_, i) => (
          <Esqueleto key={i} className={i === 0 ? "h-3.5 w-24" : "ml-auto h-3.5 w-14"} />
        ))}
      </div>
      {Array.from({ length: filas }, (_, f) => (
        <div
          key={f}
          className="grid h-[3.1rem] items-center gap-6 border-b border-rule/70 px-5"
          style={{ gridTemplateColumns: plantilla }}
        >
          {columnas.map((_, i) => (
            <Esqueleto
              key={i}
              className={i === 0 ? "h-4" : "ml-auto h-4 w-16"}
              style={i === 0 ? { width: `${45 + ((f * 37) % 40)}%` } : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
