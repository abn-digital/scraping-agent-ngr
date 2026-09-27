# Movimiento

El movimiento dice qué cambió y de dónde viene algo. Nunca decora. Todo respeta `prefers-reduced-motion`: el CSS lo apaga en `index.css` y motion lo apaga con `<MotionConfig reducedMotion="user">` en `Base.tsx`.

## Curvas y duraciones

| Qué | Valor |
|---|---|
| Curva de todo lo que entra | `ease-out` del sistema: `cubic-bezier(0.16, 1, 0.3, 1)`. En motion: `ease: [0.16, 1, 0.3, 1]`. |
| Cambios de color, fondo, borde | `duration-150` |
| Levantes, layout, anchos (riel), velos | `duration-200` |
| Rellenos de íconos, crecer imágenes | `duration-300`, `duration-500` |
| Entrada de pantalla (Shell) | opacidad 0→1 y 8 px hacia arriba, 0,2 s. Una sola, en el Shell, para que ninguna pantalla quede distinta por accidente. |
| Hoja y confirmación | entran en 0,24 s subiendo 8 px (`animate-sheet-in`), salen en 0,16 s (`animate-sheet-out`) |
| Menús y overlay | `animate-fade` 0,18 s al abrir, `animate-fade-out` 0,14 s al cerrar |
| Tooltip | `animate-rise` con demora de apertura de 220 ms |
| Filas de una lista | 0,28 s, demora `min(i × 0.035, 0.21)` |
| Indicador de segmentado | spring `stiffness 520, damping 42`, solo cuando cambia la opción (`layoutDependency={value}`) |
| Barra de `Avance` | el ancho crece en 0,5 s con la curva del sistema |
| `Lamina` trabajando | una franja ember recorre la lámina de arriba abajo en 2,1 s, `ease: [0.4, 0, 0.2, 1]`, sin fin; lo de abajo queda al 40 %, con 1 px de desenfoque y la mitad de saturación |
| Estados de `BarraDeInstruccion` | entran 6 px desde abajo y salen 6 px hacia arriba, 0,2 s, uno por vez (`mode="wait"`) |

**Abrir se anuncia, cerrar no se espera:** toda salida es más corta que su entrada.

## Reglas

- **Sin animación de salida entre rutas.** `AnimatePresence` entre pantallas deja la pantalla colgada cuando una salida se interrumpe.
- **La única excepción es un espacio de trabajo a pantalla completa en el escenario** (el estudio de creativos): entra subiendo 18 px en 0,26 s y, al volver, sale bajando 18 px en 0,2 s con `ease: [0.4, 0, 1, 1]` y recién al terminar navega (`onAnimationComplete`). Es la única pantalla que cambia de registro entero, y sin salida el salto de grafito a papel se lee como un parpadeo. Una pantalla de papel no la usa.
- **Sin `AnimatePresence` en listas paginadas:** la lista se reemplaza entera y animar la salida de cada fila hace saltar la pantalla.
- **Sin `layout` en filas que vienen de un esqueleto:** animarían desde donde se midió el esqueleto.
- **Un `layoutId` lleva algo propio del control, no solo `useId()`:** dos pantallas pueden producir el mismo id y el indicador cruza la pantalla desde la anterior.
- **Cambiar la `key` alcanza para animar un reemplazo** (una escena, un texto de botón). `AnimatePresence mode="wait"` con clicks rápidos deja el panel vacío.
- **En Tailwind 4, `translate-*` es la propiedad `translate`.** Una transición que tiene que animarlo lo nombra (`transition-[…,translate]`), y un keyframe que mueve algo anima `translate`, no `transform`: si anima `transform` se suma a las clases y el elemento termina corrido.
- **En la landing, las entradas son CSS** (`animate-rise` con `animationDelay`), no motion: el HTML prerenderizado tiene que verse aunque el JS no llegue.
- Un recorrido que avanza solo se detiene cuando la persona toca un paso, y no avanza con movimiento reducido.
