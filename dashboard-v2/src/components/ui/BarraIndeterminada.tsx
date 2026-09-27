import { cn } from "@/lib/cn";

// Algo está pasando y no se sabe cuánto falta. Es ember porque es actividad.
export function BarraIndeterminada({
  oscuro = false,
  className,
}: {
  oscuro?: boolean;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label="En curso"
      className={cn(
        "relative h-[3px] w-full overflow-hidden rounded-full",
        oscuro ? "bg-white/[.08]" : "bg-paper-sunken",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-1/3 animate-barrido rounded-full bg-ember" />
    </div>
  );
}
