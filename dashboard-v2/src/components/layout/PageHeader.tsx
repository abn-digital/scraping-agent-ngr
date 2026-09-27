import type { ReactNode } from "react";
import { useTituloDePagina } from "@/hooks/useTituloDePagina";
import { cn } from "@/lib/cn";

export function PageHeader({
  eyebrow,
  title,
  lede,
  meta,
  actions,
  wide,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  useTituloDePagina(typeof title === "string" ? title : undefined);
  return (
    <header className={cn("px-5 pt-9 md:px-10 md:pt-14", className)}>
      <div className="mx-auto max-w-[1320px]">
        {eyebrow && <div className="label mb-3">{eyebrow}</div>}

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className={cn("min-w-0", !wide && "max-w-[52ch]")}>
            <h1 className="[overflow-wrap:anywhere] font-display text-h1 font-semibold leading-[1.02] tracking-[-.03em] text-ink md:text-display md:leading-(--text-display--line-height) md:tracking-(--text-display--letter-spacing)">
              {title}
            </h1>
            {lede && <p className="mt-4 text-lede text-ink-2">{lede}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        {meta && <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2">{meta}</div>}
      </div>
    </header>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <span className="text-meta tnum text-ink">{value}</span>
    </div>
  );
}
