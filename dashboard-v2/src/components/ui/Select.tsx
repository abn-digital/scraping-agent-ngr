import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
  disabled?: boolean;
  /** Lo que busca el teclado, si no es la etiqueta: en "Sub-marca de Rappi", "Rappi". */
  match?: string;
}

const MAX_LIST_HEIGHT = 300;
const GAP = 6;
const EDGE = 8;
const TYPEAHEAD_MS = 600;

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Un contenedor con transform (un diálogo centrado) pasa a ser la referencia de position: fixed. */
function fixedOrigin(container: HTMLElement): { top: number; left: number } {
  if (container === document.body) return { top: 0, left: 0 };
  const style = getComputedStyle(container);
  const containing =
    style.transform !== "none" ||
    style.filter !== "none" ||
    style.perspective !== "none" ||
    /transform|filter/.test(style.willChange);
  if (!containing) return { top: 0, left: 0 };
  const rect = container.getBoundingClientRect();
  return { top: rect.top + container.clientTop, left: rect.left + container.clientLeft };
}

/**
 * Un select propio: el disparador es un campo más del papel y la lista es un
 * panel de grafito, como el resto de lo que se elige en la app.
 *
 * Sigue el patrón de combobox de solo selección de WAI-ARIA: el foco se queda
 * en el disparador y la opción activa se anuncia con aria-activedescendant.
 * Así funciona igual adentro de un diálogo de Radix, que no suelta el foco.
 */
export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
  label,
  placeholder = "Elegí una opción",
  disabled = false,
  invalid = false,
  className,
}: {
  id?: string;
  value: T | "";
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Nombre de la lista para lectores de pantalla; el disparador lo toma de su <label>. */
  label: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listId = `${triggerId}-lista`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const enabledFrom = useCallback(
    (start: number, step: 1 | -1) => {
      for (let index = start; index >= 0 && index < options.length; index += step) {
        if (!options[index].disabled) return index;
      }
      return -1;
    },
    [options],
  );

  const show = (index?: number) => {
    if (disabled || options.length === 0) return;
    setActive(index ?? (selectedIndex >= 0 ? selectedIndex : enabledFrom(0, 1)));
    setContainer(triggerRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body);
    setOpen(true);
  };

  const hide = () => {
    setOpen(false);
    setStyle(null);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    hide();
  };

  useLayoutEffect(() => {
    if (!open || !container) return;
    const place = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const origin = fixedOrigin(container);
      const below = window.innerHeight - rect.bottom - GAP - EDGE;
      const above = rect.top - GAP - EDGE;
      const wanted = Math.min(MAX_LIST_HEIGHT, options.length * 44 + 12);
      const up = below < wanted && above > below;
      // Un disparador angosto (el placement de una tarjeta) no puede recortar las opciones.
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - EDGE * 2);
      const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - width - EDGE);
      setStyle({
        left: left - origin.left,
        width,
        maxHeight: Math.max(120, Math.min(MAX_LIST_HEIGHT, up ? above : below)),
        top: (up ? rect.top - GAP : rect.bottom + GAP) - origin.top,
        // Hacia arriba se ancla por el borde de abajo sin medir la lista.
        transform: up ? "translateY(-100%)" : undefined,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, container, options.length]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      hide();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, style]);

  const findByTyping = (key: string): number => {
    const now = Date.now();
    const state = typeahead.current;
    state.text = now - state.at > TYPEAHEAD_MS ? key : state.text + key;
    state.at = now;
    const needle = fold(state.text);
    // Con una sola letra se busca desde la siguiente, para poder recorrer las que empiezan igual.
    const start = state.text.length === 1 ? active + 1 : Math.max(active, 0);
    for (let step = 0; step < options.length; step += 1) {
      const index = (start + step) % options.length;
      const option = options[index];
      if (!option.disabled && fold(option.match ?? option.label).startsWith(needle)) return index;
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const printable = event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        show(event.key === "Home" ? enabledFrom(0, 1) : enabledFrom(options.length - 1, -1));
      } else if (printable) {
        const found = findByTyping(event.key);
        show(found >= 0 ? found : undefined);
      }
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        const next = enabledFrom(active + 1, 1);
        if (next >= 0) setActive(next);
        return;
      }
      case "ArrowUp": {
        event.preventDefault();
        if (event.altKey) {
          choose(active);
          return;
        }
        const previous = enabledFrom(active - 1, -1);
        if (previous >= 0) setActive(previous);
        return;
      }
      case "Home":
      case "End":
        event.preventDefault();
        setActive(event.key === "Home" ? enabledFrom(0, 1) : enabledFrom(options.length - 1, -1));
        return;
      case "PageDown":
      case "PageUp": {
        event.preventDefault();
        const target = Math.max(
          0,
          Math.min(options.length - 1, active + (event.key === "PageDown" ? 10 : -10)),
        );
        const found = enabledFrom(target, event.key === "PageDown" ? -1 : 1);
        if (found >= 0) setActive(found);
        return;
      }
      case "Enter":
        event.preventDefault();
        choose(active);
        return;
      case " ":
        event.preventDefault();
        // Con una búsqueda en curso, el espacio es parte de lo que se escribe.
        if (Date.now() - typeahead.current.at < TYPEAHEAD_MS) {
          const found = findByTyping(" ");
          if (found >= 0) setActive(found);
        } else {
          choose(active);
        }
        return;
      case "Escape":
        event.preventDefault();
        hide();
        return;
      case "Tab":
        choose(active);
        return;
      default:
        if (printable) {
          const found = findByTyping(event.key);
          if (found >= 0) setActive(found);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        onBlur={hide}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-control border border-rule-strong bg-paper-raised px-3 text-left text-base text-ink",
          "transition-[border-color,box-shadow] duration-150 hover:border-ink-4",
          "focus:outline-hidden focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ember/25",
          "disabled:cursor-not-allowed disabled:bg-paper-sunken disabled:text-ink-4 disabled:hover:border-rule-strong",
          open && "border-ink ring-2 ring-ember/25",
          invalid && "border-fail ring-fail/20",
          className,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink-4")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.9}
          className={cn(
            "h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        container &&
        style &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            style={style}
            data-select-list=""
            // El foco se queda en el disparador: tocar la lista no se lo saca.
            onMouseDown={(event) => event.preventDefault()}
            className="pointer-events-auto fixed z-[70] overflow-y-auto rounded-panel bg-stage p-1.5 text-stage-ink shadow-sheet
              ring-1 ring-white/10 animate-fade scrollbar-thin scrollbar-dark"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerMove={() => !option.disabled && active !== index && setActive(index)}
                  onClick={() => choose(index)}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-3 rounded-control px-3 py-2 text-base",
                    index === active && "bg-white/10",
                    isSelected ? "text-ember-light" : "text-stage-ink",
                    option.disabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="block [overflow-wrap:anywhere]">{option.label}</span>
                    {option.hint && (
                      <span className="block text-meta text-stage-3">{option.hint}</span>
                    )}
                  </span>
                  <Check
                    aria-hidden
                    strokeWidth={2.4}
                    className={cn(
                      "h-4 w-4 shrink-0 text-ember",
                      isSelected ? "opacity-100" : "opacity-0",
                    )}
                  />
                </li>
              );
            })}
          </ul>,
          container,
        )}
    </>
  );
}
