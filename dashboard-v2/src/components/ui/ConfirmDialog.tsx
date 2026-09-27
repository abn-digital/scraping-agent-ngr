import type { ReactNode } from "react";
import { Dialog as D } from "radix-ui";
import { useFocoDeVuelta } from "@/hooks/useFocoDeVuelta";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Eliminar",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const foco = useFocoDeVuelta();
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px] data-[state=open]:animate-fade data-[state=closed]:animate-fade-out" />
        <D.Content
          // Sin descripción, Radix avisa por consola. Anular el vínculo solo en
          // ese caso: pasarlo siempre le saca la descripción al lector de pantalla.
          {...(description ? {} : { "aria-describedby": undefined })}
          {...foco}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-[420px] -translate-x-1/2
            -translate-y-1/2 rounded-sheet bg-paper-raised p-6 shadow-sheet focus:outline-hidden
            data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out"
        >
          {/* El título suele llevar el nombre de lo que se borra, y un nombre
              sin espacios no tiene dónde cortar: se salía de la hoja. */}
          <D.Title className="font-display text-h3 font-semibold text-ink [overflow-wrap:anywhere]">
            {title}
          </D.Title>
          {description && (
            <D.Description className="mt-2 text-base leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
              {description}
            </D.Description>
          )}
          <div className="mt-7 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
