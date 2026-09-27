# Accesibilidad

Antes de dar por terminada una pantalla:

- [ ] **Teclado:** se llega a todo con Tab, en un orden que tiene sentido, y el foco se ve siempre (contorno ember). Un contorno que se oculta (`outline-hidden`) solo vale si otro elemento dibuja el foco, como la fila de una lista.
- [ ] **Saltar al contenido:** el primer Tab del Shell y del sitio lo ofrece.
- [ ] **Nombres:** todo botón de solo ícono tiene `aria-label`; todo ícono decorativo tiene `aria-hidden`; todo campo tiene su `label` asociado (`Field` con `htmlFor`).
- [ ] **Diálogos:** título siempre; descripción vinculada cuando existe (las primitivas lo resuelven: no pases `aria-describedby`). Al cerrar, el foco vuelve a lo que lo tenía (`useFocoDeVuelta`, ya adentro de `Sheet` y `ConfirmDialog`).
- [ ] **Campos:** la ayuda o el error quedan atados al campo por `Field` (con `htmlFor`): el lector de pantalla los dice al entrar.
- [ ] **Cambiar de pantalla:** el título de la pestaña cambia (`PageHeader` o `useTituloDePagina`) y el foco pasa al contenido nuevo (lo hace el Shell). Toda pantalla tiene un `h1`, aunque sea `sr-only`, y las que están fuera del Shell, su `<main>`.
- [ ] **Lo que carga se anuncia:** un esqueleto es `aria-hidden`; al lado va un `role="status"` con "Cargando …" en `sr-only`.
- [ ] **Estados que cambian solos:** lo que el lector de pantalla tiene que escuchar va en `aria-live="polite"` (el anuncio de `CampoBusqueda`, "Cambios sin guardar").
- [ ] **Página actual y paso actual:** `aria-current` en el paginador, la navegación y los pasos.
- [ ] **Movimiento reducido:** con la preferencia activa no se mueve nada que no sea esencial. Probalo con el emulador del navegador.
- [ ] **Táctil:** lo que aparece al pasar el mouse lleva `al-pasar`; los objetivos táctiles tienen al menos 28 px (h-7) y los importantes 36 (h-9).
- [ ] **Contraste:** texto de lectura en `ink` o `ink-2` sobre papel, `stage-ink` o `stage-3` sobre escenario; `ink-4` y `stage-3/60` solo para lo que no hace falta leer.

## Deuda conocida

Decidido al tomar el sistema: los colores son los de creativos, píxel por píxel. Eso deja abajo del mínimo de WCAG AA (4,5 a 1) algunos textos secundarios. Cuando se decida cambiarlo, es un cambio de tokens en `index.css` y se hace en creativos y acá a la vez.

| Texto | Fondo | Contraste |
|---|---|---|
| `ink-3` (metadatos, ayudas, `label`) | papel · papel levantado · papel hundido | 3,84 · 4,22 · 3,44 |
| `ink-4` (placeholders, cuentas) | papel | 2,33 |
| ember como texto | papel | 3,17 |
| blanco sobre ember (paso activo) | ember | 3,64 |

- Los campos no llevan `aria-invalid`: en creativos nunca se prendía, y prenderlo pinta el borde de rojo, que creativos no muestra.
- La cruz de los avisos se anuncia "Close toast": renombrarla pide sonner 2, que cambia cómo se ven los avisos.
- [ ] **Idioma:** `lang="es"` en el HTML; fechas y números con `es-AR`.
