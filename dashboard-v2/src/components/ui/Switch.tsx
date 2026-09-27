import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onChange,
  label,
  id,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-ink" : "bg-rule-strong",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "block h-[18px] w-[18px] rounded-full bg-paper-raised shadow-[0_1px_2px_rgba(20,19,15,.25)]",
          "transition-[translate] duration-150 ease-out",
          checked ? "translate-x-[19px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
