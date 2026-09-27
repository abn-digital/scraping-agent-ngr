import { Toaster } from "sonner";

// Sonner inyecta su CSS al importarse, sin capa. En Tailwind 4 las utilidades
// viven en @layer utilities y el CSS sin capa les gana siempre, así que las
// clases de abajo no pisarían nada y los avisos se apilarían distinto que en
// creativos. Metido en la capa `sonner` (declarada primera en index.css),
// vuelve a perder contra cualquier utilidad.
if (typeof document !== "undefined") {
  for (const estilo of document.head.querySelectorAll("style")) {
    const css = estilo.textContent ?? "";
    if (css.includes("[data-sonner-toaster]") && !css.startsWith("@layer")) {
      estilo.textContent = `@layer sonner{${css}}`;
    }
  }
}

// Sin richColors: sonner pinta sus propios verdes y rojos, que no son los del
// sistema. El aviso es una hoja de papel como todo lo demás y de qué se trata
// lo dice el ícono, que sonner ya pone por tipo.
export function Avisos() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      // Sin esto la región se anuncia en inglés ("Notifications alt+T"). La
      // cruz sigue diciendo "Close toast": renombrarla pide sonner 2, que
      // cambia cómo se ven los avisos (ver ORIGEN.md).
      containerAriaLabel="Avisos"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group relative flex w-full items-start gap-3 overflow-hidden rounded-panel " +
            // El padding derecho le deja lugar a la cruz, que va absoluta en
            // esa esquina: sin eso el botón de la acción se le mete debajo.
            "border border-rule bg-paper-raised py-3.5 pl-4 pr-11 shadow-lift",
          title: "text-base font-medium leading-snug text-ink",
          description: "mt-1 text-meta leading-relaxed text-ink-2",
          icon: "mt-0.5 shrink-0",
          actionButton:
            "ml-auto shrink-0 rounded-control bg-ink px-2.5 py-1 text-meta font-medium text-paper-raised",
          cancelButton:
            "shrink-0 rounded-control px-2.5 py-1 text-meta font-medium text-ink-3 hover:text-ink",
          // Sonner la ancla al borde izquierdo y encima le pone un translate
          // propio, que la termina de meter contra la esquina redondeada.
          // Anulado el transform, `top` la deja alineada con el centro de la
          // primera línea de texto, que es donde se lee como parte del aviso.
          closeButton:
            "left-auto! right-3! top-3! m-0! transform-none! grid h-7! w-7! place-items-center rounded-control " +
            "border-0! bg-transparent! text-ink-3! transition-colors duration-150 " +
            "hover:bg-paper-sunken! hover:text-ink!",
          error: "[&_[data-title]]:text-fail",
        },
      }}
    />
  );
}
