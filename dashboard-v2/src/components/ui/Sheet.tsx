import type { ReactNode } from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { useFocoDeVuelta } from "@/hooks/useFocoDeVuelta";
import { cn } from "@/lib/cn";

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  const w = { sm: "max-w-[420px]", md: "max-w-[560px]", lg: "max-w-[860px]" }[width];
  const foco = useFocoDeVuelta();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay
          className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]
            data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
        />
        <D.Content
          // Sin descripción, Radix avisa por consola. Anular el vínculo solo en
          // ese caso: pasarlo siempre le saca la descripción al lector de pantalla.
          {...(description ? {} : { "aria-describedby": undefined })}
          {...foco}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2",
            "overflow-hidden rounded-sheet border border-rule-strong bg-paper-raised shadow-sheet",
            "focus:outline-hidden data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
            w,
          )}
        >
          <header className="flex items-start justify-between gap-6 px-6 pb-4 pt-5">
            <div className="min-w-0">
              <D.Title className="font-display text-h3 font-semibold text-ink">{title}</D.Title>
              {description && (
                <D.Description className="mt-1 text-base text-ink-3">{description}</D.Description>
              )}
            </div>
            <D.Close
              aria-label="Cerrar"
              className="-mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-control text-ink-3
                transition-colors hover:bg-paper-sunken hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </D.Close>
          </header>

          <div className="scrollbar-thin max-h-[min(66vh,620px)] overflow-y-auto px-6 py-5">
            {children}
          </div>

          {footer && (
            <footer className="flex items-center justify-end gap-2 bg-paper px-6 py-4">
              {footer}
            </footer>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
