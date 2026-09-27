# Visual

La fuente de verdad es `apps/web/src/index.css`. Acá está cuándo va cada token. Las escalas de color, texto, radio y sombra están cerradas: una clase de Tailwind que no es del sistema (`bg-blue-500`, `text-sm`, `rounded-lg`, `shadow-md`) no compila y el lint la marca.

## Dos registros

| Registro | Superficie | Para qué |
|---|---|---|
| Papel | `bg-paper` (hueso cálido, nunca blanco) | Navegar, leer, listas, formularios, metadatos. |
| Escenario | `bg-stage` + `stage-grid` | Mostrar el objeto del producto: la banda del último, el panel del detalle, los heros de primera vez, el recorrido. |

Sobre el escenario: texto principal `text-stage-ink`, secundario `text-stage-3` (y `/70`, `/60` para terciario), superficies `bg-white/[.03]` a `[.07]`, bordes `border-white/10` a `/25` o `border-stage-rule`, error `text-fail-soft`, ember claro `text-ember-light`. Las primitivas cambian de registro por prop: `Button tone="dark"`, `Chip dark`, `Esqueleto oscuro`, `Segmented dark`, `ZonaDeArchivo dark`, `Measure dark`, `BarraIndeterminada oscuro`, `Pulso oscuro`.

## Color

| Token | Uso |
|---|---|
| `paper` / `paper-raised` / `paper-sunken` | Fondo / lo que se apoya encima (hojas, menús, tarjetas al pasar) / lo hundido (campos quietos, elegidos, hover suave). |
| `ink`, `ink-2`, `ink-3`, `ink-4` | Texto y botón principal / secundario / metadatos y etiquetas / lo que casi no se lee (placeholders, íconos quietos). |
| `rule`, `rule-strong` | Reglas de 1px (casi nunca) / borde de campos y botones outline. |
| `ember` | **Único color de marca.** Solo cuando algo está pasando (punto que late, barra indeterminada, "Resumiendo") o está elegido (ícono del riel activo, paso activo, check del cliente activo, anillo de lo seleccionado). También el foco, la zona de drop y el subrayado al pasar por un link. |
| `pass`, `fail`, `warn` | Estado. En claro, sus `-wash` y `-rule` para fondos y bordes de chips; en el escenario, `-soft`. |

Un color que falta se agrega en `index.css` con un comentario que diga para qué existe, no se escribe un hex en una clase.

## Tipografía

- **Bricolage Grotesque** (`font-display`): todo titular (h1 a h3), títulos de hoja y de confirmación, titulares de vacíos, el nombre del producto, números grandes de resumen. Nunca en párrafos ni en controles. Siempre `font-semibold` con tracking negativo: `-.03em` h1, `-.025em` h2, `-.018em` h3.
- **Instrument Sans**: el default del `body`. `font-sans` no se escribe nunca.
- **JetBrains Mono** (`font-mono`): el valor cuando es técnico: números de paso `01`, medidas, ids, `kbd`, mensajes de error técnicos. La etiqueta de ese valor va en la sans.

| Token | Para qué |
|---|---|
| `text-display` | El `h1` de página en escritorio (`md:text-display`). |
| `text-h1` | El `h1` en celular y los titulares de heros oscuros. |
| `text-h2` | Titular de pantallas de estado (404, error, login) y del recorrido. |
| `text-h3` | Titular de sección, título de hoja y de confirmación, nombre en filas de lista, titular de vacíos. |
| `text-lede` | Bajada del encabezado, párrafos de hero, búsqueda grande. |
| `text-base` | Cuerpo, filas compactas, menús, campos. |
| `text-meta` | Metadatos, fechas, cuentas, ayudas bajo campos. El más usado. |
| `text-micro` | Números de paso en mono, versalitas decorativas mínimas. |
| `text-nano` | La tecla de un atajo, la cuenta de un segmentado, la etiqueta de la barra inferior. |

- `.label` es la etiqueta de un dato: 13 px, 500, `ink-3`, en minúscula y en la sans. Cuando todo grita nada tiene jerarquía.
- Toda cifra lleva `tnum`: las columnas se alinean solas.
- Un titular con `md:text-display` y `leading-*` o `tracking-*` propios lleva también `md:leading-(--text-display--line-height) md:tracking-(--text-display--letter-spacing)`: en Tailwind 4 un leading explícito le gana al del token en todos los tamaños.
- Botones `sm` y `lg`, chips, segmentados, paginador y medida no fijan tamaño de letra: heredan el del contexto. Así se ven en creativos.

## Forma

- `rounded-control` (10): botones, campos, ítems de menú y de lista chica.
- `rounded-panel` (14): filas de lista, tarjetas, paneles, menús, zonas de drop.
- `rounded-sheet` (20): hojas y confirmación. `rounded-chip` (6): chips y `kbd`. `rounded-control-inner` (8): la opción activa adentro de un control con `p-0.5`.
- `rounded-full`: puntos de estado, avatares, barras de progreso, el botón redondo de "crear".
- **Lo que se muestra no se redondea**: miniaturas, hojas, piezas, en cero o `rounded-[2px]` a `[4px]` como mucho.

## Sombras

| Token | Uso |
|---|---|
| `shadow-card` / `shadow-card-lift` | La fila o tarjeta que se levanta al pasar (con `-translate-y-0.5`). Reemplaza al borde. |
| `shadow-sheet` | Todo lo que flota: hojas, confirmación, menús, tooltip. |
| `shadow-lift` | El aviso. |
| `shadow-piece` / `shadow-piece-lift` | Lo que se muestra, apoyado en el escenario. |
| `shadow-rail` / `shadow-studio` | El riel / una mesa oscura apoyada sobre el papel. |
| `shadow-bevel` | El filo de luz del botón primario oscuro. |

Tinte cálido y no negro: el papel es hueso y una sombra neutra se ve sucia encima.

## Espaciado y anchos

| Qué | Valor |
|---|---|
| Canaleta de página | `px-5 md:px-10` |
| Contenedor | `mx-auto max-w-[1320px]` |
| Arranque de página | `pt-9 md:pt-14` (lo pone `PageHeader`); con fila de "volver": `pt-6 md:pt-8` y el encabezado `pt-5 md:pt-6` |
| Barra de herramientas bajo el título | sección `pt-10 md:pt-14`, `flex flex-col gap-4 md:flex-row md:items-center md:justify-between` |
| Paginador | arriba `mt-6`, abajo `mt-8`; la lista `mt-4` |
| Fila de lista | `px-4 py-4 md:px-5 md:py-5`, la lista `space-y-1` |
| Fila compacta (miembros, invitaciones) | `px-4 py-3`, `gap-x-4 gap-y-2`, `rounded-panel`, `hover:bg-paper-raised` |
| Botones juntos | `gap-2` |
| Ícono y texto | `gap-1.5` (chips, links chicos), `gap-2` (botones), `gap-2.5`/`gap-3` (menús, filas) |
| Dos columnas (texto e ilustración, formulario y resumen) | `gap-10 md:gap-14` |
| Grilla de imágenes | `gap-x-7 gap-y-10` |
| Formulario en hoja | `space-y-6` entre campos; `Field` ya trae `space-y-1.5` |
| Cierre de página | `<div className="h-16" />` |
| Medidas de lectura | `52ch` bajada de hero y de encabezado, `46ch` columnas de texto y estados de error, `48ch` párrafo de vacío |
| Controles | búsqueda `md:max-w-[420px]`; hoja `sm` 420, `md` 560, `lg` 860; tooltip 260 |

## Íconos

Lucide, fijado en la versión de creativos (0.469): la 1.x redibujó trece íconos.

| Uso | Tamaño | Trazo |
|---|---|---|
| Dentro de un botón `sm` o acción compacta | `h-3.5 w-3.5` | `2` |
| Dentro de un botón `md` | `h-4 w-4` | `2` (el más de crear, `2.2`) |
| Ítems de menú, riel, decorativos de lista | `h-4 w-4` | `1.75` |
| Ícono de un estado vacío | `h-6 w-6` | `1.6` |
| Navegación (riel y barra inferior) | `h-[21px] w-[21px]` | `1.75` |
| Beneficios de un hero | `h-[22px] w-[22px] text-ember` | `1.6` |

Ícono decorativo con `aria-hidden`; botón de solo ícono con `aria-label`. Cuanto más grande el ícono, más fino el trazo.

Los íconos del riel (`components/ui/RailIcons.tsx`) se dibujan a trazo y llenan de ember una sola forma cuando la sección está activa: copiá la forma de los que están.

## Marca

`components/ui/Mark.tsx` es la marca del producto: una forma en `currentColor` y un solo acento en ember. Hereda el color del texto que la rodea, así que sirve en el papel y en el escenario sin variantes. Reemplazala por la tuya respetando esa gramática, actualizá `public/favicon.svg` y regenerá los PNG que salen de él (`npm run iconos --workspace apps/web`): el de 180 es el que iOS pone en la pantalla de inicio.
