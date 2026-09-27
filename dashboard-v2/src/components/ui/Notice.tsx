import type { ReactNode } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "fail" | "warn" | "info";

const TONES: Record<Tone, string> = {
  fail: "border-fail-rule bg-fail-wash text-fail",
  warn: "border-warn-rule bg-warn-wash text-warn",
  info: "border-rule bg-paper-raised text-ink-2",
};

const ICONS = { fail: CircleAlert, warn: TriangleAlert, info: Info };

export function Notice({
  tone = "fail",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const Icon = ICONS[tone];
  return (
    <div
      role={tone === "fail" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-panel border px-4 py-3",
        TONES[tone],
        className,
      )}
    >
      <Icon className="mt-[3px] h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="text-base font-medium leading-snug">{title}</p>}
        {children && (
          <div
            className={cn(
              "text-meta leading-relaxed [overflow-wrap:anywhere]",
              title ? "mt-0.5 text-ink-2" : "text-base",
            )}
          >
            {children}
          </div>
        )}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
