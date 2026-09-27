import { cn } from "@/lib/cn";

// La marca de Price Intelligence: una etiqueta de precio en currentColor y el
// ojal en ember, el único acento. El ojal es el punto donde se mira: el precio
// propio contra el de la competencia. Hereda el color del texto que la rodea,
// así que funciona en el papel y en el escenario sin variantes.
export function Mark({ size = 25, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden
      fill="none"
    >
      <path
        d="M2.5 4A1.5 1.5 0 0 1 4 2.5h7.4a1.5 1.5 0 0 1 1.06.44l8.6 8.6a1.5 1.5 0 0 1 0 2.12l-7.4 7.4a1.5 1.5 0 0 1-2.12 0l-8.6-8.6A1.5 1.5 0 0 1 2.5 11.4z"
        fill="currentColor"
      />
      <circle cx="7.6" cy="7.6" r="2.2" fill="var(--color-ember)" />
    </svg>
  );
}
