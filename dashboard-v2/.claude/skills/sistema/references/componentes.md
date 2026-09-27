# Componentes

Todo vive en `apps/web/src/components/ui` y `components/layout`. Radix y sonner se usan solo a través de estas piezas: el lint rechaza importarlos desde una pantalla.

## Acción

| Pieza | API | Cuándo |
|---|---|---|
| `Button` | `variant`: primary, outline (default), quiet, ghost, danger, link · `size`: sm, md, lg, icon, icon-sm · `tone`: light, dark · `loading` · `asChild` | **Un solo `primary` por pantalla.** `quiet` para la acción secundaria que igual tiene que verse ("Cómo funciona"), `ghost` para volver o cancelar, `danger` solo en la confirmación de algo irreversible. Con `asChild` envuelve un `Link`. Mientras trabaja: `loading` y el texto en gerundio con elipsis ("Guardando…"). |
| `RowMenu` + `RowMenuItem` + `RowMenuSeparator` | `label` (aria) · ítems con `onSelect`, `danger`, `disabled` | Las acciones de una fila o tarjeta. Aparece al pasar por la fila (`group` en el contenedor) y está siempre en táctil. Lo destructivo va al final, después de un separador. |
| `MenuBoton` | `etiqueta`, `icono`, `opciones` (valor, nombre), `onElegir`, `tone`, `size`, `loading`, `disabled` | Un botón con nombre que abre una lista corta: exportar en un formato, bajar una variante. Para las acciones de una fila está `RowMenu`, que no tiene nombre. En el escenario del celular queda solo el ícono. |
| `BarraDeInstruccion` | `estado` (libre, trabajando, error, lista), `etiqueta`, `placeholder`, `mensajeListo`, `onMandar`, `onReintentar`, `onDescartar`, `bloqueo` | Donde se le pide algo a la IA, sobre el escenario. Enter manda, ⇧ Enter corta la línea, crece hasta 132 px. Todos los estados miden lo mismo (`--alto-barra` del contenedor, 60 px por defecto). Si falla, la instrucción no se pierde: Reintentar o Descartar. `bloqueo` reemplaza el campo cuando pedir no aplica (se está mirando algo viejo) por el porqué y la única salida. |
| `Tooltip` + `TooltipProvider` | `label`, `side`, `shortcut` | Nombra un botón de solo ícono y enseña su atajo. Un botón deshabilitado no recibe el mouse: para explicar por qué está deshabilitado, envolvelo en un `<span>` y el tooltip va sobre el span. |

## Campos

| Pieza | API | Cuándo |
|---|---|---|
| `Field` + `Input` / `Textarea` | `label`, `hint`, `error`, `htmlFor` | Todo campo. Etiqueta arriba; abajo la ayuda o el error, nunca los dos. El error sale del schema de Zod compartido con la API: el mensaje no se escribe dos veces. |
| `CampoBusqueda` | `value`, `onChange`, `placeholder`, `ariaLabel`, `buscando`, `anuncio`, `size` | La búsqueda de una lista. El valor crudo va acá; a la consulta va el diferido (`useDiferido(q.trim(), 300)`). Mientras la consulta viaja, un punto ember late en lugar de la cruz. |
| `NombreEditable` | `nombre`, `onRename`, `esquema`, `etiqueta`, `inputClassName`, `autoEditar` | Renombrar en el lugar: lápiz al pasar, Enter guarda, Escape cancela, perder el foco guarda. Valida con el mismo schema que la API. |
| `ZonaDeArchivo` | `file`, `onFile`, `accept`, `validar`, `invitacion`, `descripcion`, `dark` | Elegir un archivo: soltarlo o abrir el diálogo del sistema. Valida tipo y peso **antes** de subir. |
| `Segmented` | `value`, `onChange`, `options` (label, icon, count), `ariaLabel`, `size`, `dark`, `plano` | Elegir entre pocas opciones a la vista (filtro, vista, rol). El indicador se desliza. Si las opciones no entran, la tira hace scroll con velos a los costados. |

## Navegar y ubicarse

| Pieza | API | Cuándo |
|---|---|---|
| `PageHeader` + `Metric` | `eyebrow`, `title`, `lede`, `meta`, `actions`, `wide` | El encabezado de toda página del app. `wide` cuando el título no tiene que cortar a 52ch. |
| `Paginador` | `pagina`, `total`, `porPagina`, `onPagina`, `etiqueta` | Listas paginadas por el back. Va arriba y abajo de la lista. Muestra el rango ("21–40 de 312"). |
| `Stepper` | `steps` (n, title, hint, blockedBy), `current`, `onGo` | Un armado en pasos. Un paso bloqueado dice qué le falta. |
| `Shell` | — | El riel (216 px abierto, 60 cerrado, atajo `[`), la barra inferior en celular y la entrada de cada pantalla. Las secciones salen de `src/navegacion.tsx`. |

## Estado

| Pieza | API | Cuándo |
|---|---|---|
| `Esqueleto` | `className`, `oscuro` | Lo que carga. Se compone con la geometría exacta de lo que va a llegar: al llegar los datos, nada se mueve de lugar. |
| `Pulso` | `estado`: en-curso, fallo, listo · `oscuro` | El estado de un trabajo en una línea. Late en ember mientras está en curso. |
| `BarraIndeterminada` | `oscuro` | Algo pasa y no se sabe cuánto falta. |
| `Avance` | `total`, `listos`, `fallidos`, `estado` (en-cola, corriendo, pausado, terminado), `nombres`, `grande` | Un lote que se sabe cuánto falta: barra verde y roja, el porcentaje y las cuentas (listos, fallidos, pendientes). El mismo en la lista (chico) y en el detalle (`grande`, con las palabras). La casilla del estado está siempre: la fila no cambia de alto al pausar. |
| `PasoDelBorrador` | `paso`, `de` | Un armado en pasos que quedó a medias: "Paso 3 de 4" en ember, donde después va el `Avance`. |
| `Lamina` | `ancho`, `alto`, `src`, `alt`, `estado` (lista, vacia, trabajando), `children`, `encima` | Lo que el producto produce, apoyado en el escenario: sin radio, sombra de pieza, su proporción real. Vacía es un marco punteado; trabajando atenúa lo anterior y lo recorre una línea ember, sin taparlo. |
| `Chip` | `tone`: neutral, muted, pass, fail, warn, ember · `dark` · `mono` | Un rol, un estado, una medida. `mono` cuando el valor es técnico. |
| `EstadoVacio` | `icon`, `titulo`, `consulta`, `bajada`, `acciones` | "Ningún X todavía" o "No se encontraron X con "q"". Siempre con la acción que lo resuelve. |
| `ErrorDeCarga` | `err`, `onRetry`, `recurso` | Un detalle que no cargó: distingue "ya no está" (404, no se reintenta) de "no llegó" (se reintenta). |
| `Avatar` | `nombre`, `size` | Personas en listas (md) y en el menú de cuenta (sm). |
| `Measure` | `children`, `dark` | Una cota con su valor en mono: una medida, un tamaño. |

## Capas

| Pieza | API | Cuándo |
|---|---|---|
| `Sheet` | `open`, `onOpenChange`, `title`, `description`, `footer`, `width` | Crear o editar algo sin salir de la pantalla. Cuerpo con scroll propio, pie en papel con la acción principal a la derecha. |
| `ConfirmDialog` | `open`, `onOpenChange`, `title`, `description`, `confirmLabel`, `onConfirm` | Solo para lo irreversible. El título nombra lo que se borra; la descripción dice qué se pierde y qué queda. |
| `aviso.ok` / `aviso.error` / `aviso.info` (`lib/avisos.ts`) | `(mensaje, opciones?)` · `opciones.action`: `{ label: "Deshacer", onClick }` | Confirmar lo que pasó fuera de la vista o que tarda, o ofrecer deshacer lo que se acaba de hacer. No más de tres en pantalla; el mismo texto reemplaza al anterior. |
| Errores de mutaciones | — | Los muestra solo el `MutationCache`: no hace falta un `aviso.error` en cada `catch`. |

## Primera vez y recorridos

| Pieza | API | Cuándo |
|---|---|---|
| `PrimeraVez` | `etiqueta`, `titulo`, `bajada`, `ilustracion`, `tituloLista`, `items`, `onEmpezar` | La primera vez que alguien entra a una sección vacía: vende lo que la sección hace, en el escenario. No es un vacío con otro nombre. |
| `Recorrido` | `titulo`, `bajada`, `pasos` (title, what, ms), `escena`, `claveDeEscena`, `onFinish`, `finishLabel` | "Cómo funciona": avanza solo hasta que la persona toca un paso. La escena es una maqueta de bloques, no una captura: no promete un resultado concreto. |
| `Halos` | — | La profundidad del escenario en un hero: un halo ember y uno blanco muy tenue. |

## Lógica compartida del front

| Pieza | Para qué |
|---|---|
| `cn()` (`lib/cn.ts`) | Combinar clases. Conoce la escala del sistema: `cn("text-meta", "text-ink-3")` conserva las dos. |
| `useDiferido(valor, ms)` | Esperar a que se deje de tipear antes de consultar. |
| `useDesborde()` | Saber si una tira horizontal tiene contenido cortado a los costados. |
| `useCentinela(pedirMas, activo)` | El scroll infinito de una grilla: devuelve la ref de una marca al final que pide la tanda siguiente 800 px antes de llegar. |
| `useCambiosSinGuardar(sucio)` | Preguntar antes de irse con cambios sin guardar: cerrar la pestaña lo avisa el navegador; un link de la app pasa por `ConfirmDialog` con `confirmacion`. `alSalir(irse)` para salidas que no son un link. |
| `useTituloDePagina(titulo)` | El título de la pestaña. `PageHeader` lo pone solo cuando el título es texto; una pantalla sin `PageHeader` lo llama. |
| `useFocoDeVuelta()` | Devolverle el foco a lo que lo tenía cuando se cierra un diálogo controlado. `Sheet` y `ConfirmDialog` ya lo usan; un diálogo propio, también. |
| `descargar(href, nombre)`, `descargarBlob(blob, nombre)` (`lib/descargar.ts`) | Bajar un archivo. El nombre solo manda con un blob o una URL del mismo origen; con una URL firmada el nombre lo pone el servidor (`Content-Disposition`). |
| `plural(n, uno, varios?)` (`lib/plural.ts`) | "1 nota", "3 notas", "1 imagen", "2 imágenes". Nunca "1 notas". |
| `relativo(iso)` (`lib/fechas.ts`) | "hace 5 min", "en 7 d". |
| `errorMessage`, `statusOf`, `ErrorDeUsuario` (`lib/errors.ts`) | El mensaje que se muestra sale del back o de un `ErrorDeUsuario`; cualquier otro error muestra el texto de respaldo. |
| `TEXTOS` (`lib/textos.ts`) | Los textos que vinieron con la plantilla y dependen de la voz. Lo nuevo va inline. |
