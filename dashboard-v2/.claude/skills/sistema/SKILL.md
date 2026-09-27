---
name: sistema
description: El sistema de diseño, UX y prácticas de este proyecto, heredado de creativos. Usala antes de crear o cambiar una pantalla, un componente, un texto de interfaz, una animación, un endpoint, un job o cualquier cosa de accesos.
---

# El sistema

Este proyecto nació de `abn-digital/product-design-system`, que es la foto del sistema de creativos. El sistema **se usa, no se reinventa**: una pantalla nueva se arma con las primitivas, los tokens y los patrones que ya existen. Si algo no encaja, primero se discute si el sistema tiene que crecer, y recién después se construye.

## Para cualquier cambio de interfaz

1. **Encontrá la pieza.** Leé [references/componentes.md](references/componentes.md) y [references/patrones.md](references/patrones.md) y elegí la primitiva y el patrón que resuelven el caso.
   Una lista es la lista de notas; un vacío es `EstadoVacio`; algo que tarda es `Pulso` más polling; un lote que avanza es `Avance`.
   Terminó cuando cada parte de la pantalla tiene su pieza nombrada, o una razón escrita de por qué no la tiene.
2. **Componé con tokens.** Colores, tamaños de texto, radios, sombras y curvas salen de `apps/web/src/index.css`. Qué token va dónde: [references/visual.md](references/visual.md). El lint rechaza lo que no es del sistema.
3. **Escribí el texto** en la voz del proyecto (`voz` en `.receta.json`) con el tono de [references/voz.md](references/voz.md).
4. **Mové lo que se mueve** con las curvas y duraciones de [references/movimiento.md](references/movimiento.md).
5. **Verificá.** `npm run verificar` en verde, y mirá la pantalla de verdad en escritorio y en 390 px, con teclado (el foco se ve siempre) y con movimiento reducido. Checklist en [references/accesibilidad.md](references/accesibilidad.md). Si tocaste algo de `components/ui`, mirala también en `/sistema`.

## Lo innegociable

- **Un solo color de marca, ember, y solo para actividad o elección.** Nunca de decoración.
- **Dos registros:** el papel (hueso cálido) para navegar y leer, el escenario (grafito frío) para mostrar el objeto del producto. Lo que se apoya en el escenario cambia de registro por prop (`tone="dark"`, `dark`, `oscuro`).
- **El marco se redondea, lo que se muestra no.** Sin bordes para separar: una sombra corta y cálida.
- **Abrir se anuncia, cerrar no se espera.** Entradas de 0,24 a 0,32 s con `ease-out` (0.16, 1, 0.3, 1); salidas más cortas.
- **El foco se ve siempre.** `outline-hidden` solo donde otro elemento dibuja el foco.
- **Lo que aparece al pasar el mouse lleva `al-pasar`:** en un teléfono no hay hover.
- **Las primitivas no se editan para una pantalla.** Si una pantalla necesita otra variante, la variante entra al sistema con su porqué, y la prueba píxel del generador decide si rompe algo.

## Referencias

- [references/visual.md](references/visual.md): tokens, registros, tipografía, forma, sombras, espaciado e íconos.
- [references/componentes.md](references/componentes.md): cada primitiva, su API y cuándo va.
- [references/patrones.md](references/patrones.md): pantallas de lista y detalle, vacíos, primera vez, esqueletos, trabajos asíncronos, subidas, renombrar, borrar, avisos y errores.
- [references/movimiento.md](references/movimiento.md): duraciones, curvas, motion y movimiento reducido.
- [references/voz.md](references/voz.md): tono, fórmulas y la voz del proyecto.
- [references/accesibilidad.md](references/accesibilidad.md): lo que se verifica antes de dar algo por terminado.
