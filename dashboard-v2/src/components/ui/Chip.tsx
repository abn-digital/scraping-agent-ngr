import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "pass" | "fail" | "warn" | "ember" | "muted";

const TONES: Record<Tone, string> = {
  neutral: "border-rule-strong bg-paper-raised text-ink-2",
  muted: "border-transparent bg-paper-sunken text-ink-3",
  pass: "border-pass-rule bg-pass-wash text-pass",
  fail: "border-fail-rule bg-fail-wash text-fail",
  warn: "border-warn-rule bg-warn-wash text-warn",
  ember: "border-ember/35 bg-ember-soft text-ember-deep",
};

const TONES_DARK: Record<Tone, string> = {
  neutral: "border-stage-rule bg-white/[.05] text-stage-ink",
  muted: "border-transparent bg-white/[.05] text-stage-3",
  pass: "border-pass/40 bg-pass/15 text-pass-soft",
  fail: "border-fail/45 bg-fail/15 text-fail-soft",
  warn: "border-warn/45 bg-warn/15 text-warn-soft",
  ember: "border-ember/45 bg-ember/15 text-ember-light",
};

export function Chip({
  children,
  tone = "neutral",
  dark = false,
  mono = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dark?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        // Sin tamaño de letra: hereda el del contexto, como en creativos (ver
        // ORIGEN.md). Un chip dentro de un metadato se lee en meta.
        // min-h y no h: con el texto al 200 % la etiqueta crece en vez de desbordarse.
        "inline-flex min-h-[22px] items-center gap-1.5 rounded-chip border px-2 leading-none",
        mono && "font-mono tnum",
        dark ? TONES_DARK[tone] : TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
