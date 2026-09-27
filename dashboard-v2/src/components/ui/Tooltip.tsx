import type { ReactNode } from "react";
import { Tooltip as T } from "radix-ui";

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <T.Provider delayDuration={220} skipDelayDuration={400}>
    {children}
  </T.Provider>
);

// El tooltip es un pedazo del escenario apoyado sobre el papel: mismo grafito,
// misma tinta.
export function Tooltip({
  children,
  label,
  side = "top",
  shortcut,
}: {
  children: ReactNode;
  label: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  shortcut?: string;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={7}
          collisionPadding={10}
          className="z-50 max-w-[260px] rounded-control border border-white/10 bg-stage-raised px-2.5 py-1.5 text-meta leading-snug text-stage-ink shadow-sheet
            data-[state=delayed-open]:animate-rise"
        >
          <span className="flex items-center gap-2">
            {label}
            {shortcut && (
              <kbd className="rounded-chip bg-white/10 px-1 py-px font-mono text-nano text-white/70">
                {shortcut}
              </kbd>
            )}
          </span>
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
