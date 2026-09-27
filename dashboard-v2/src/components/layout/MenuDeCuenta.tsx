import type { ReactNode } from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { ChevronsUpDown, LogOut } from "lucide-react";
import type { Variante } from "@/components/layout/Shell";
import { cn } from "@/lib/cn";

const item =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-base " +
  "text-ink-2 outline-hidden transition-colors data-[highlighted]:bg-paper-sunken data-[highlighted]:text-ink";

const iniciales = (nombre: string) =>
  nombre
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export interface OpcionDeCuenta {
  etiqueta: string;
  icono?: (props: {
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }) => ReactNode;
  onSelect: () => void;
}

/**
 * La cuenta, al pie del riel. Arriba del menú, quién es; en el medio, lo que
 * cada app necesite (su perfil, el equipo, ajustes); al final, salir.
 */
export function MenuDeCuenta({
  variante,
  nombre,
  email,
  bajada,
  foto,
  opciones = [],
  extra,
  onSalir,
}: {
  variante: Variante;
  nombre: string;
  email?: string;
  /** La segunda línea del botón en el riel: el rol, el plan, el cliente. Si falta, el email. */
  bajada?: string;
  foto?: string | null;
  opciones?: OpcionDeCuenta[];
  /** Algo propio de la app que va entre quién es y las opciones (un uso, un plan). */
  extra?: ReactNode;
  onSalir?: () => void;
}) {
  const expandido = variante === "riel";
  const avatar = foto ? (
    <img src={foto} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-medium text-paper-raised"
    >
      {iniciales(nombre || email || "?")}
    </span>
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Tu cuenta"
        className={cn(
          "flex items-center gap-2.5 rounded-control text-left transition-colors duration-150",
          "hover:bg-paper-sunken/70 focus-visible:outline-offset-2",
          expandido
            ? "w-full px-2.5 py-2"
            : variante === "barra"
              ? "h-10 w-10 justify-center"
              : "h-11 w-11 justify-center",
        )}
      >
        {avatar}
        {expandido && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-base font-medium text-ink">{nombre}</span>
              <span className="block truncate text-meta text-ink-3">{bajada ?? email}</span>
            </span>
            <ChevronsUpDown
              className="h-4 w-4 shrink-0 text-ink-4"
              strokeWidth={1.75}
              aria-hidden
            />
          </>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          side={variante === "barra" ? "bottom" : "top"}
          align={variante === "barra" ? "end" : "start"}
          sideOffset={8}
          collisionPadding={10}
          className="z-50 w-[260px] rounded-panel bg-paper-raised p-1.5 shadow-sheet
            data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
        >
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="truncate text-base text-ink">{nombre}</p>
            {email && <p className="truncate text-meta text-ink-3">{email}</p>}
          </div>

          {extra && <div className="px-2.5 pb-2">{extra}</div>}

          {opciones.length > 0 && <Menu.Separator className="my-1 h-px bg-rule" />}
          {opciones.map(({ etiqueta, icono: Icono, onSelect }) => (
            <Menu.Item key={etiqueta} onSelect={onSelect} className={item}>
              {Icono && <Icono className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
              {etiqueta}
            </Menu.Item>
          ))}

          {onSalir && (
            <>
              <Menu.Separator className="my-1 h-px bg-rule" />
              <Menu.Item onSelect={onSalir} className={item}>
                <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Cerrar sesión
              </Menu.Item>
            </>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
