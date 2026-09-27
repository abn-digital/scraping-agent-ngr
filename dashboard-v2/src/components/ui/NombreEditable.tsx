import { Pencil, X } from "lucide-react";
import type { ZodType } from "zod";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/cn";

export function NombreEditable({
  nombre,
  onRename,
  children,
  className,
  inputClassName,
  etiqueta,
  autoEditar,
  esquema,
}: {
  nombre: string;
  onRename: (nuevo: string) => void;
  children: ReactNode;
  className?: string;
  inputClassName?: string;
  etiqueta?: string;
  autoEditar?: boolean;
  /**
   * La misma regla que valida la API. Se valida acá para no gastar un pedido
   * que ya se sabe que va a rebotar, pero el mensaje sale del schema y no
   * escrito de nuevo: si no, el día que cambie la regla el front miente.
   */
  esquema?: ZodType<string>;
}) {
  const [editando, setEditando] = useState(autoEditar ?? false);
  const [valor, setValor] = useState(nombre);
  const lapiz = useRef<HTMLButtonElement>(null);
  // Al cerrar con Enter o Escape el campo desaparece y el foco caía en <body>:
  // vuelve al lápiz. Si se cerró con un clic afuera, el foco ya está donde se
  // hizo el clic y no se toca. Un cuadro después y no en el acto: con el foco
  // ya en el lápiz, el mismo Enter que guardó lo activaba y volvía a abrir.
  const volverAlLapiz = useRef(false);
  useEffect(() => {
    if (editando || !volverAlLapiz.current) return;
    volverAlLapiz.current = false;
    const cuadro = requestAnimationFrame(() => lapiz.current?.focus());
    return () => cancelAnimationFrame(cuadro);
  }, [editando]);

  // Cuando autoEditar pasa a true (un alta recién creada), entra a editar. Se
  // ajusta durante el render y no en un efecto: así no hay un render de más
  // mostrando el nombre quieto.
  const [autoAnterior, setAutoAnterior] = useState(autoEditar);
  if (autoEditar !== autoAnterior) {
    setAutoAnterior(autoEditar);
    if (autoEditar) setEditando(true);
  }

  const cerrar = (guardar: boolean) => {
    setEditando(false);
    const limpio = valor.trim();

    if (!guardar || limpio === nombre) return setValor(nombre);

    const problema = esquema?.safeParse(limpio);
    if (problema && !problema.success) {
      aviso.error(problema.error.issues[0]?.message ?? "Ese nombre no sirve");
      return setValor(nombre);
    }

    onRename(limpio);
  };

  if (editando) {
    return (
      <span className={cn("flex w-full min-w-0 items-center gap-1.5", className)}>
        <input
          autoFocus
          value={valor}
          aria-label={etiqueta ?? "Nombre"}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => cerrar(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") volverAlLapiz.current = true;
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") cerrar(false);
          }}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "min-w-0 flex-1 rounded-control bg-paper-sunken px-2 py-1 text-ink focus:outline-hidden",
            inputClassName,
          )}
        />
        <button
          // onMouseDown y no onClick: el campo guarda al perder el foco, y un
          // clic normal lo hubiera blureado ANTES de llegar acá. Cancelando el
          // mousedown el foco no se mueve y el cierre lo decide este botón.
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            cerrar(false);
          }}
          aria-label="Cancelar el cambio de nombre"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-control text-ink-4
            transition-colors duration-150 hover:bg-paper-sunken hover:text-ink"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </span>
    );
  }

  return (
    <span className={cn("group/nombre flex min-w-0 items-center gap-2", className)}>
      <span className="min-w-0">{children}</span>
      <button
        ref={lapiz}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setValor(nombre);
          setEditando(true);
        }}
        aria-label={nombre ? `Renombrar ${nombre}` : "Ponerle un nombre"}
        // relative y z-10 porque la fila entera suele ser un enlace con un
        // ::after que la cubre: sin esto el clic cae en el enlace y navega.
        className="al-pasar relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-control
          text-ink-4 opacity-0 transition-[opacity,background-color,color] duration-150
          hover:bg-paper-sunken hover:text-ink focus-visible:opacity-100
          group-hover:opacity-100 group-hover/nombre:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </button>
    </span>
  );
}
