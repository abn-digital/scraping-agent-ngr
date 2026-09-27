import type { ComponentType } from "react";
import { DropdownMenu as Menu } from "radix-ui";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export interface OpcionDeMenu<T extends string> {
  valor: T;
  nombre: string;
}

// Un botón con nombre que abre una lista corta: exportar en un formato, bajar
// una variante. Para las acciones de una fila está RowMenu, que no tiene nombre.
export function MenuBoton<T extends string>({
  etiqueta,
  icono: Icono,
  opciones,
  onElegir,
  disabled,
  loading,
  tone = "light",
  size = "sm",
  className,
}: {
  etiqueta: string;
  icono?: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  opciones: OpcionDeMenu<T>[];
  onElegir: (valor: T) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Oscuro sobre el escenario; claro sobre el papel. */
  tone?: "dark" | "light";
  size?: "sm" | "md";
  className?: string;
}) {
  const oscuro = tone === "dark";

  return (
    <Menu.Root>
      <Menu.Trigger asChild disabled={disabled || loading}>
        <Button
          tone={oscuro ? "dark" : undefined}
          variant="outline"
          size={size}
          loading={loading}
          // En el celular el nombre se esconde: el botón no puede quedar mudo.
          aria-label={oscuro && Icono ? etiqueta : undefined}
          className={className}
        >
          {!loading && Icono && <Icono className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />}
          {/* En el escenario del celular queda solo el ícono: la barra no alcanza. */}
          <span className={oscuro && Icono ? "hidden md:inline" : undefined}>{etiqueta}</span>
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          collisionPadding={10}
          className={cn(
            "z-50 w-[160px] rounded-panel p-1.5 shadow-sheet data-[state=open]:animate-fade data-[state=closed]:animate-fade-out",
            oscuro ? "bg-stage-raised ring-1 ring-white/10" : "bg-paper-raised ring-1 ring-rule",
          )}
        >
          {opciones.map(({ valor, nombre }) => (
            <Menu.Item
              key={valor}
              onSelect={() => onElegir(valor)}
              className={cn(
                "cursor-pointer rounded-control px-2.5 py-2 text-base outline-hidden transition-colors",
                oscuro
                  ? "text-stage-ink data-[highlighted]:bg-white/[.07]"
                  : "text-ink data-[highlighted]:bg-paper-sunken",
              )}
            >
              {nombre}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
