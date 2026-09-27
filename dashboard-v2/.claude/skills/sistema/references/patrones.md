# Patrones

Cada patrón tiene un ejemplo vivo en la plantilla. Copiá el ejemplo y cambiá el dominio: no lo reescribas desde la descripción.
## Pantalla de lista

Ejemplo: `features/note/NotesPage.tsx`. El orden de arriba abajo:

1. **Banda del último, en el escenario** (`UltimaNota`): el objeto más reciente mostrado como se muestra el producto, con su acción principal. Se pide aparte de la lista (`limit: 1`): si saliera del listado paginado, desaparecería al cambiar de página o al buscar. Alto mínimo fijo: sin piso, la banda salta según el contenido.
2. **Barra de herramientas**: `CampoBusqueda` a la izquierda; a la derecha, "Cómo funciona" (`quiet`) y el botón de alta.
3. **Paginador arriba**, la lista, **paginador abajo**.
4. **Filas**: la fila entera es un enlace. El `<Link>` del título lleva `after:absolute after:inset-0` y cubre la fila; los controles de la fila (lápiz, menú) van con `relative z-10` para quedar arriba. El foco se dibuja en la fila con `has-[a:focus-visible]:outline-…`, porque un contorno alrededor del título solo no dice qué fila es. Al pasar, la fila se levanta: `group-hover:-translate-y-0.5 group-hover:bg-paper-raised group-hover:shadow-card` con `transition-[background-color,box-shadow,translate] duration-200 ease-out`.
5. **Entrada escalonada** de las filas: `opacity 0→1, y 8→0`, `0.28 s`, demora `min(i × 0.035, 0.21)`. Sin `layout` (animaría desde donde midió el esqueleto) y sin `AnimatePresence` (al cambiar de página la salida hace saltar la pantalla).
6. **Alta en línea** (`FilaNueva`): una fila punteada con el campo en `font-display text-h3` y un botón redondo que se habilita cuando el nombre sirve. Enter crea, Escape cancela. El botón "Nueva" es el mismo que "Cancelar": el más gira 135° y el texto sube mientras el otro entra. Dos botones que se reemplazan hacen saltar la barra.
7. **Borrar**: el menú de la fila abre `ConfirmDialog`; la mutación invalida la lista.

La búsqueda y la paginación las hace el back sobre el total: filtrar en el front sobre una página ya recortada deja resultados fuera de vista. El vacío mira el valor **diferido** y no el crudo: al limpiar el campo, la consulta vieja todavía no volvió y por un instante mostraría el mensaje equivocado.
## Primera vez

Con cero objetos y sin búsqueda, la lista se reemplaza por `PrimeraVez` (en el escenario) seguido de `Recorrido`. "Empezar" baja hasta el recorrido; el último paso del recorrido abre el alta en línea. El estado `creando` tiene prioridad sobre "primera vez": si no, con cero objetos nunca se llega a ver la fila para crear el primero. Como el recorrido reemplaza la pantalla sin cambiar de ruta, la entrada del Shell no corre: se repone con `animate-rise`.
## Detalle

Ejemplo: `features/note/NotePage.tsx`.

- Fila de "volver" (`Button ghost sm` con flecha) arriba, en `pt-6 md:pt-8`.
- Título editable en el lugar (`NombreEditable` con `inputClassName` del mismo tamaño), metadatos con `Metric`, acción destructiva a la derecha como `ghost`.
- Contenido en dos columnas `md:grid-cols-[minmax(0,1fr)_360px]`: lo que se edita a la izquierda, el objeto o su estado en un panel de escenario a la derecha.
- Guardar explícito, con "Cambios sin guardar" visible y ⌘ Enter. El borrador se reinicia con `key={id}` al pasar a otro objeto.
- Irse con cambios sin guardar pregunta: `useCambiosSinGuardar(cambiado)` y un `ConfirmDialog` "Cambios sin guardar" / "Salir sin guardar" con su `confirmacion`. Cubre el riel, "volver" y cerrar la pestaña; un clic con ⌘ abre otra pestaña y pasa derecho.
- Error de carga: `ErrorDeCarga`, que distingue 404 (no se reintenta) de "no llegó" (se reintenta).
## Esqueletos

Cada pantalla tiene su esqueleto con la geometría exacta de lo que va a llegar (`NotesSkeleton`): mismos anchos, mismos altos, mismas grillas. En el escenario, `Esqueleto oscuro`. Se muestra solo mientras no hay nada que mostrar (`isLoading && items.length === 0`): al cambiar de página, `keepPreviousData` deja la lista vieja y el punto de la búsqueda late.
## Renombrar

`NombreEditable` sobre el título. La mutación es optimista: `onMutate` cambia la caché, `onError` la restaura, `onSettled` invalida. El error lo muestra el `MutationCache`; no hace falta un `aviso.error` en la pantalla.

## Borrar y otras acciones irreversibles

Siempre `ConfirmDialog`. Título con el nombre de lo que se borra entre comillas; descripción con lo que se pierde y lo que queda ("Su cuenta y lo que hizo quedan; se lo puede volver a invitar"). El botón dice el verbo ("Eliminar", "Sacar"). Nada irreversible se hace sin esa confirmación, y nada reversible la pide.

## Deshacer

Lo que se puede deshacer no pregunta antes: se hace, y el aviso ofrece volver atrás.

```ts
aviso.ok(`Se eliminó "${nombre}"`, { action: { label: "Deshacer", onClick: () => void restaurar(id) } });
```

Para eso el back tiene que poder deshacerlo: un borrado lógico (`deletedAt`) con su endpoint de restaurar y una purga que corre después, no un `DELETE` que se lleva la fila. El aviso nombra lo que pasó con el objeto adentro; "Deshacer" lo deja exactamente donde estaba.

## Estado en la URL

La búsqueda, el filtro y la carpeta de una lista viven en la URL (`useSearchParams`, `?q=`), no en un `useState`: un link compartido abre lo mismo, F5 no lo pierde y "volver" vuelve a donde estaba. La página del paginador, en cambio, vuelve a 1 cuando cambia la búsqueda.

## Armado en pasos

`Stepper` arriba y un paso por pantalla. Lo que se arma en varios pasos se guarda solo:

- 900 ms después de que se deja de tipear, y solo si algo cambió.
- Al crearse el borrador, la URL pasa a la suya (`history.replaceState` a `/<recurso>/<id>/editar`): F5 vuelve al mismo armado y no a uno nuevo vacío.
- Al volver, retoma en el paso donde quedó; en la lista, el borrador muestra `PasoDelBorrador` en vez del avance.
- Un paso bloqueado dice qué le falta.

## Descargas

Un archivo se baja con `MenuBoton` si hay variantes (formato, tamaño) y con un botón si no. Varios archivos van en un ZIP que arma el servidor: bajar N sueltos pide N permisos y Chrome corta después del primero. El front baja el ZIP como blob y lo guarda con `descargarBlob`, que suelta la memoria enseguida. El nombre del archivo lo pone el servidor en `Content-Disposition`: con una URL de otro origen, el navegador ignora el que diga el front.

## Avisos

`aviso.ok` para confirmar algo que pasó fuera de la vista o que tarda; `aviso.info` para explicar por qué algo no hizo nada; `aviso.error` solo fuera de mutaciones (las mutaciones avisan solas). Como mucho tres en pantalla, y el mismo mensaje reemplaza al anterior en vez de apilarse. Una mutación que no tiene que avisar su error lleva `meta: { silent: true }`.

## Errores

- Lo que dice el back se muestra tal cual: el back escribe sus mensajes para la persona.
- Sin red: "No se pudo conectar con el servidor."
- Un error que no se sabe explicar muestra el texto de respaldo, nunca un mensaje técnico en inglés.
- La pantalla entera no se cae: `ErrorBoundary` dice qué pasó y deja volver a cargar o ir al inicio.
- 404 de ruta: `NotFoundPage` explica por qué suele pasar.

## Teclado

- `[` abre y cierra el riel (fuera de campos de texto).
- Enter confirma y Escape cancela en todo campo que edita en el lugar.
- ⌘ Enter guarda en un textarea.
- Un atajo nuevo se enseña en el tooltip del botón que lo hace (`shortcut`), y no se dispara mientras el foco está en un campo.

## Celular y táctil

- Por debajo de `md` el riel desaparece y aparece la barra inferior de 14 de alto; el contenido lleva `pb-14`, y el `scroll-padding-bottom` de `index.css` evita que un Tab deje el foco detrás de la barra.
- Lo que aparece al pasar el mouse (`opacity-0 group-hover:opacity-100`) lleva `al-pasar`: en táctil se ve siempre.
- Las grillas bajan de columnas (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`), los encabezados pasan de fila a columna (`flex-col md:flex-row`) y los títulos de `display` a `h1`.
- Probá cada pantalla en 390 px de ancho antes de darla por terminada.
