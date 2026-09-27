import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import { Slot } from "radix-ui";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "outline" | "quiet" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm";

// `translate` y no `transform` en la transición: en Tailwind 4 el
// active:translate-y-px escribe la propiedad `translate`, y sin nombrarla el
// botón baja de golpe en vez de hundirse.
const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control " +
  "font-medium transition-[background-color,color,border-color,box-shadow,translate] duration-150 ease-out " +
  "disabled:pointer-events-none disabled:opacity-40 active:translate-y-px";

const LIGHT: Record<Variant, string> = {
  primary: "bg-ink text-paper-raised shadow-bevel hover:bg-ink-hover active:bg-ink-press",
  outline: "border border-rule-strong bg-paper-raised text-ink hover:border-ink-3 hover:bg-white",
  quiet: "bg-paper-sunken text-ink-2 hover:bg-paper-sunken-hover hover:text-ink",
  ghost: "text-ink-2 hover:bg-paper-sunken hover:text-ink",
  danger:
    "border border-fail-rule bg-fail-wash text-fail hover:border-fail/50 hover:bg-fail-wash-hover",
  link: "text-ink underline decoration-rule-strong underline-offset-4 hover:decoration-ember",
};

const DARK: Record<Variant, string> = {
  primary: "bg-stage-ink text-stage hover:bg-white",
  outline:
    "border border-stage-rule bg-white/[.03] text-stage-ink hover:border-white/25 hover:bg-white/[.07]",
  quiet: "bg-white/[.06] text-stage-ink hover:bg-white/[.12]",
  ghost: "text-stage-3 hover:bg-white/[.07] hover:text-stage-ink",
  danger: "border border-fail/40 bg-fail/10 text-fail-soft hover:bg-fail/20",
  link: "text-stage-ink underline decoration-white/25 underline-offset-4 hover:decoration-ember",
};

// sm y lg no fijan tamaño de letra: heredan el del contexto. Es como se ven en
// creativos (ver ORIGEN.md); ponerles uno cambia todos los botones del sistema.
const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5",
  md: "h-9 px-3.5 text-base",
  lg: "h-11 px-5",
  icon: "h-9 w-9",
  "icon-sm": "h-7 w-7",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  tone?: "light" | "dark";
  loading?: boolean;
  asChild?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant = "outline",
  size = "md",
  tone = "light",
  loading = false,
  asChild = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      disabled={disabled || loading}
      data-loading={loading || undefined}
      className={cn(BASE, SIZES[size], tone === "dark" ? DARK[variant] : LIGHT[variant], className)}
      {...rest}
    >
      {/* Con `asChild` el hijo tiene que ser uno solo: el Slot de Radix lo
          clona, y no puede clonar dos. El spinner solo entra en el botón real. */}
      {asChild ? (
        children
      ) : (
        <>
          {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}
