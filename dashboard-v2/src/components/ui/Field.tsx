import {
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const SHELL =
  "w-full rounded-control border bg-paper-raised px-3 text-base text-ink placeholder:text-ink-4 " +
  "transition-[border-color,box-shadow] duration-150 " +
  "border-rule-strong hover:border-ink-4 " +
  "focus:border-ink focus:outline-hidden focus:ring-2 focus:ring-ember/25 " +
  "disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-4 " +
  "aria-[invalid=true]:border-fail aria-[invalid=true]:ring-fail/20";

export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return <input className={cn(SHELL, "h-9", className)} {...rest} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <textarea
      className={cn(SHELL, "max-h-[60vh] min-h-[92px] resize-y py-2 leading-relaxed", className)}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  // La ayuda o el error quedan atados al campo: sin esto, el lector de pantalla
  // lleva el foco al campo con error y nunca dice cuál es el error.
  const idAyuda = htmlFor && (error || hint) ? `${htmlFor}-ayuda` : undefined;
  const campo =
    idAyuda && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
          "aria-describedby": [
            (children as ReactElement<{ "aria-describedby"?: string }>).props["aria-describedby"],
            idAyuda,
          ]
            .filter(Boolean)
            .join(" "),
        })
      : children;

  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="label block text-ink-2">
        {label}
      </label>
      {campo}
      {error ? (
        <p id={idAyuda} className="text-meta text-fail">
          {error}
        </p>
      ) : hint ? (
        <p id={idAyuda} className="text-meta text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
