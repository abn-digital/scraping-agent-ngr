import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useMatch, useResolvedPath } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Dialog as D } from "radix-ui";
import { Ellipsis, PanelLeft, X } from "lucide-react";
import { Mark } from "@/components/ui/Mark";
import { Tooltip } from "@/components/ui/Tooltip";
import { useDesbordeVertical } from "@/hooks/useDesborde";
import { cn } from "@/lib/cn";
import { NAV, type ItemDeNavegacion } from "@/navegacion";
import { PRODUCTO } from "@/producto";

function useEnLaSeccion(to: string, end: boolean, tambien?: string): boolean {
  const resolved = useResolvedPath(to);
  const propia = useMatch({ path: resolved.pathname, end }) !== null;
  // Los hooks no se pueden llamar condicionalmente: sin prefijo aparte esto
  // vuelve a preguntar por la propia ruta y el OR no cambia nada.
  const aparte =
    useMatch({ path: tambien ?? resolved.pathname, end: tambien ? false : end }) !== null;

  return propia || aparte;
}

const RAIL_COLLAPSED = 60;
const RAIL_EXPANDED = 216;
const STORAGE_KEY = `${PRODUCTO.slug}:rail-expanded`;
// La barra de abajo tiene lugar para cuatro secciones y "Más".
const EN_BARRA = 4;

function RailLink({
  to,
  label,
  icon: Icon,
  end,
  tambien,
  expanded,
}: ItemDeNavegacion & { expanded: boolean }) {
  // El estado activo se calcula acá en vez de usar el render-prop de NavLink:
  // el Slot de Radix, que es lo que hace `asChild` del tooltip, no puede
  // clonar un elemento cuyos children son una función.
  const active = useEnLaSeccion(to, end, tambien);

  // Link y no NavLink: el aria-current de NavLink solo mira su propia ruta, y
  // el detalle tiene que anunciar su sección como la actual.
  const link = (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-10 items-center rounded-control transition-colors duration-150",
        expanded ? "w-full gap-3 px-3" : "w-11 justify-center",
        active ? "text-ink" : "text-ink-3 hover:bg-paper-sunken/70 hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="rail-active"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 -z-10 rounded-control bg-paper-sunken"
        />
      )}
      <Icon className="relative h-[21px] w-[21px] shrink-0" strokeWidth={1.75} activo={active} />
      <span className={cn("relative truncate text-base", expanded ? "font-medium" : "sr-only")}>
        {label}
      </span>
    </Link>
  );

  return expanded ? (
    link
  ) : (
    <Tooltip label={label} side="right">
      {link}
    </Tooltip>
  );
}

/** Las secciones en el orden de NAV, partidas donde cambia el grupo. */
function porGrupo(items: ItemDeNavegacion[]): { grupo?: string; items: ItemDeNavegacion[] }[] {
  const salida: { grupo?: string; items: ItemDeNavegacion[] }[] = [];
  for (const item of items) {
    const ultimo = salida.at(-1);
    if (ultimo && ultimo.grupo === item.grupo) ultimo.items.push(item);
    else salida.push({ grupo: item.grupo, items: [item] });
  }
  return salida;
}

/**
 * El marco de toda pantalla de la app: el riel (216 px abierto, 60 cerrado,
 * atajo `[`), la barra de abajo en el celular y la entrada de cada pantalla.
 *
 * `arriba` va debajo de la marca: el selector de cliente o de marca, que es un
 * contexto y no una sección. `abajo` va al pie del riel: la cuenta. Los dos
 * reciben cómo está el riel (`"riel"`, `"compacto"` o `"barra"` en el celular)
 * para dibujarse a su medida.
 */
export type Variante = "riel" | "compacto" | "barra";

export function Shell({
  children,
  nav = NAV,
  arriba,
  abajo,
}: {
  children: ReactNode;
  nav?: ItemDeNavegacion[];
  arriba?: (variante: Variante, riel: number) => ReactNode;
  abajo?: (variante: Variante) => ReactNode;
}) {
  const { pathname } = useLocation();
  // La animación de entrada va por pantalla, no por URL: un cambio que no es
  // otra pantalla (una solapa, un parámetro) no tiene que repetirla. Si una
  // sección tiene sub-rutas que son la misma pantalla, normalizalas acá.
  const pantalla = pathname;

  const [expanded, setExpanded] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setExpanded((v) => {
      try {
        localStorage.setItem(STORAGE_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (
        el instanceof HTMLElement &&
        (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))
      )
        return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const rail = expanded ? RAIL_EXPANDED : RAIL_COLLAPSED;
  const quieto = useReducedMotion() ?? false;
  // Las secciones `alPie` (Ajustes, Superadmin) van abajo, junto a la cuenta,
  // como en la v1: así las de todos los días no las empujan fuera de la vista.
  const principales = nav.filter((n) => !n.alPie);
  const alPie = nav.filter((n) => n.alPie);
  const { ref: refDeLaLista, abajo: listaCortada } = useDesbordeVertical<HTMLDivElement>();

  // Cambiar de pantalla lleva el foco al contenido nuevo: si no, queda en el
  // link del riel y el lector de pantalla no se entera de que algo cambió. La
  // primera carga no: ahí el foco es del navegador y del link para saltar. Si
  // la pantalla ya puso el foco en algo suyo (un autoFocus), se respeta.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    const main = document.getElementById("contenido");
    if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
  }, [pantalla]);

  const enBarra = nav.some((n) => n.enBarra)
    ? nav.filter((n) => n.enBarra).slice(0, EN_BARRA)
    : nav.slice(0, nav.length > EN_BARRA + 1 ? EN_BARRA : EN_BARRA + 1);
  const resto = nav.filter((n) => !enBarra.includes(n));

  return (
    <div
      className="paper-grain min-h-screen bg-paper"
      style={{ ["--rail" as string]: `${rail}px` }}
    >
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]
          focus:rounded-control focus:bg-ink focus:px-3 focus:py-2 focus:text-meta focus:text-paper-raised"
      >
        Saltar al contenido
      </a>

      <nav
        aria-label="Principal"
        style={{ width: rail }}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col justify-between bg-paper-raised/80
          py-4 shadow-rail backdrop-blur-xs transition-[width] duration-200 ease-out md:flex"
      >
        <div className="relative flex min-h-0 flex-col">
          <div
            ref={refDeLaLista}
            className={cn(
              "scrollbar-none flex min-h-0 flex-col gap-5 overflow-y-auto",
              expanded ? "items-stretch px-3" : "items-center px-2",
            )}
          >
            <NavLink
              to="/"
              aria-label={PRODUCTO.nombre}
              className={cn(
                "flex shrink-0 items-center text-ink",
                expanded ? "h-11 gap-3 px-3" : "h-9 justify-center",
              )}
            >
              <Mark size={expanded ? 34 : 32} />
              {expanded && (
                // Un nombre de dos palabras que no entra en una línea va en dos,
                // como un logotipo, en vez de cortarse con puntos suspensivos.
                <span
                  title={PRODUCTO.nombre}
                  className="line-clamp-2 min-w-0 font-display text-[1.35rem] font-semibold leading-[.95] tracking-[-.04em]"
                >
                  {PRODUCTO.nombre}
                </span>
              )}
            </NavLink>

            {arriba?.(expanded ? "riel" : "compacto", rail)}

            <div className={cn("flex flex-col gap-4", expanded ? "items-stretch" : "items-center")}>
              {porGrupo(principales).map(({ grupo, items }, i) => (
                <div
                  key={`${grupo ?? "sin-grupo"}-${i}`}
                  className={cn(
                    "flex flex-col gap-0.5",
                    expanded ? "items-stretch" : "items-center",
                  )}
                >
                  {grupo &&
                    (expanded ? (
                      <p className="px-3 pb-1 text-micro font-medium text-ink-4">{grupo}</p>
                    ) : (
                      i > 0 && <span aria-hidden className="mb-2 h-px w-6 bg-rule" />
                    ))}
                  {items.map((n) => (
                    <RailLink key={n.to} {...n} expanded={expanded} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Si hay secciones cortadas abajo, un velo del color del riel lo dice. */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-paper-raised to-transparent",
              "transition-opacity duration-200",
              listaCortada ? "opacity-100" : "opacity-0",
            )}
          />
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col gap-1 pt-3",
            expanded ? "items-stretch px-3" : "items-center",
          )}
        >
          {alPie.length > 0 && (
            <div
              className={cn(
                "flex flex-col gap-0.5 pb-1",
                expanded ? "items-stretch" : "items-center",
              )}
            >
              {alPie.map((n) => (
                <RailLink key={n.to} {...n} expanded={expanded} />
              ))}
            </div>
          )}
          {abajo?.(expanded ? "riel" : "compacto")}

          <Tooltip
            label={expanded ? "Achicar el riel" : "Expandir el riel"}
            side="right"
            shortcut="["
          >
            <button
              onClick={toggle}
              aria-expanded={expanded}
              aria-label={expanded ? "Achicar la navegación" : "Expandir la navegación"}
              className={cn(
                "flex h-10 items-center gap-3 rounded-control text-ink-3 transition-colors duration-150",
                "hover:bg-paper-sunken hover:text-ink",
                expanded ? "px-3" : "w-10 justify-center",
              )}
            >
              <PanelLeft
                className={cn(
                  "h-[21px] w-[21px] shrink-0 transition-transform duration-200 ease-out",
                  expanded && "rotate-180",
                )}
                strokeWidth={1.75}
              />
              {expanded && <span className="truncate text-base">Achicar</span>}
            </button>
          </Tooltip>
        </div>
      </nav>

      {/* En el celular, lo que en el riel va arriba y abajo pasa a una barra
          fija arriba: la marca, el contexto y la cuenta. */}
      {(arriba || abajo) && (
        <header
          className="sticky top-0 z-30 flex h-14 items-center gap-1.5 border-b border-rule bg-paper-raised/95 px-3
            backdrop-blur-sm md:hidden"
        >
          <Link
            to="/"
            aria-label={PRODUCTO.nombre}
            className="grid h-10 w-9 shrink-0 place-items-center text-ink"
          >
            <Mark size={26} />
          </Link>
          <div className="flex min-w-0 flex-1 items-center">
            {arriba ? (
              arriba("barra", rail)
            ) : (
              <span className="truncate font-display text-lede font-semibold tracking-[-.03em] text-ink">
                {PRODUCTO.nombre}
              </span>
            )}
          </div>
          {abajo?.("barra")}
        </header>
      )}

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-bottom))] items-stretch
          border-t border-rule bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {enBarra.map((item) => (
          <BarraLink key={item.to} {...item} />
        ))}
        {resto.length > 0 && <MasSecciones items={resto} />}
      </nav>

      {/* La entrada de cada pantalla vive acá y no en cada página: el key por
          pantalla ya remonta esto en toda navegación, así que una sola
          animación alcanza para todas y ninguna queda distinta por accidente.
          Corta y sobria —8px— porque son páginas.

          Sin animación de salida: AnimatePresence entre rutas deja la pantalla
          colgada cuando una salida se interrumpe. */}
      <motion.main
        id="contenido"
        tabIndex={-1}
        key={pantalla}
        initial={quieto ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[1] min-h-screen pb-20 transition-[padding] duration-200 ease-out outline-hidden
          md:pb-0 md:pl-[var(--rail)]"
      >
        {children}
      </motion.main>
    </div>
  );
}

function BarraLink({ to, label, icon: Icon, end, tambien }: ItemDeNavegacion) {
  const active = useEnLaSeccion(to, end, tambien);

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-nano font-medium tracking-wide",
        active ? "text-ink" : "text-ink-3",
      )}
    >
      {active && <span className="absolute inset-x-6 top-0 h-[2px] bg-ember" />}
      <Icon className="h-[21px] w-[21px]" strokeWidth={1.75} activo={active} />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/**
 * Lo que no entra en la barra de abajo. Una hoja que sube desde el borde, con
 * las secciones en sus grupos: en un teléfono el riel no existe y sin esto las
 * secciones de más quedarían inalcanzables.
 */
function MasSecciones({ items }: { items: ItemDeNavegacion[] }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  // Si la sección actual está acá adentro, "Más" se marca como la actual.
  const adentro = items.some((i) =>
    i.end
      ? pathname === i.to
      : pathname === i.to ||
        pathname.startsWith(`${i.to}/`) ||
        (i.tambien ? pathname.startsWith(i.tambien) : false),
  );

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger
        className={cn(
          "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-nano font-medium tracking-wide",
          adentro ? "text-ink" : "text-ink-3",
        )}
      >
        {adentro && <span className="absolute inset-x-6 top-0 h-[2px] bg-ember" />}
        <Ellipsis className="h-[21px] w-[21px]" strokeWidth={1.75} aria-hidden />
        Más
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/45 data-[state=open]:animate-fade data-[state=closed]:animate-fade-out" />
        <D.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-sheet bg-paper-raised px-3
            pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-sheet focus:outline-hidden
            data-[state=open]:animate-rise data-[state=closed]:animate-fade-out"
        >
          <div className="flex items-center justify-between px-3 pb-2">
            <D.Title className="font-display text-h3 font-semibold text-ink">Más secciones</D.Title>
            <D.Close
              aria-label="Cerrar"
              className="grid h-9 w-9 place-items-center rounded-control text-ink-3 hover:bg-paper-sunken hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </D.Close>
          </div>
          {porGrupo(items).map(({ grupo, items: delGrupo }, i) => (
            <Fragment key={`${grupo ?? "sin-grupo"}-${i}`}>
              {grupo && <p className="px-3 pb-1 pt-3 text-micro font-medium text-ink-4">{grupo}</p>}
              {delGrupo.map((n) => (
                <FilaDeMas key={n.to} {...n} onIr={() => setOpen(false)} />
              ))}
            </Fragment>
          ))}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

function FilaDeMas({
  to,
  label,
  icon: Icon,
  end,
  tambien,
  onIr,
}: ItemDeNavegacion & { onIr: () => void }) {
  const active = useEnLaSeccion(to, end, tambien);
  return (
    <Link
      to={to}
      onClick={onIr}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-12 items-center gap-3 rounded-control px-3 text-base",
        active ? "bg-paper-sunken font-medium text-ink" : "text-ink-2 hover:bg-paper-sunken/70",
      )}
    >
      <Icon className="h-[21px] w-[21px] shrink-0" strokeWidth={1.75} activo={active} />
      {label}
    </Link>
  );
}
