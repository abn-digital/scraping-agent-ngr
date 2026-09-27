import { cn } from "@/lib/cn";

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export function Avatar({ nombre, size = "md" }: { nombre: string; size?: "sm" | "md" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-medium",
        size === "sm"
          ? "h-7 w-7 bg-ink text-[11px] text-paper-raised"
          : "h-9 w-9 bg-paper-sunken text-meta text-ink-2",
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
