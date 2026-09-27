# El front v2

Esta carpeta es el front nuevo de la app, armado con el sistema de diseño de
**creativos** tal como lo empaqueta `abn-digital/product-design-system`, más lo
que `abn-digital/creative-check` le sumó y las piezas de datos que hacían falta
acá. Vive en `/v2` del mismo dominio que la v1: misma sesión, misma API, y la v1
sigue intacta en la raíz hasta que la v2 se apruebe.

Antes de crear o cambiar una pantalla, un componente o un texto, leé la skill
[`.claude/skills/sistema`](.claude/skills/sistema/SKILL.md). Es la misma que
trae todo proyecto generado por product-design-system.

## Lo innegociable (resumen de la skill)

- Un solo color de marca, **ember**, y solo para actividad o elección. Nunca de decoración.
- Dos registros: el **papel** (hueso cálido) para navegar y leer; el **escenario** (grafito) para mostrar el objeto del producto. Lo que se apoya en el escenario cambia de registro por prop (`tone="dark"`, `dark`, `oscuro`).
- El marco se redondea, lo que se muestra no. Sin bordes para separar: una sombra corta y cálida.
- Abrir se anuncia, cerrar no se espera: entradas de 0,24 a 0,32 s con `ease-out`, salidas más cortas.
- El foco se ve siempre. Lo que aparece al pasar el mouse lleva `al-pasar`.
- Las escalas de color, texto, radio y sombra están cerradas: `bg-blue-500`, `text-sm`, `rounded-lg` o `shadow-md` no existen y el lint los rechaza. Un color que falta va en `src/index.css` con su porqué.
- Un solo `Button variant="primary"` por pantalla.
- La interfaz habla de **vos**. Sin signos de exclamación. Oración con mayúscula inicial, nunca Title Case.

## Lo que la v2 suma al sistema

| Pieza | Dónde | Para qué |
|---|---|---|
| Colores de datos `dato-1`…`dato-6` (y `-soft` en el escenario) | `src/index.css` | Series de gráficos, validadas contra daltonismo. Se asignan por entidad con `coloresPorEntidad(todas)` y nunca se reciclan: la séptima va en `ink-4` como "Otras". |
| `numero`, `compacto`, `porcentaje`, `moneda`, `variacion`, `fecha`, `SENTIMIENTO` | `src/lib/datos.ts` | Formatos en es-AR y los tonos del sentimiento (pass, ink-4, fail). |
| `Cifra`, `Chispa` | `components/datos/Cifra.tsx` | Un número que es la respuesta, con variación y tendencia. |
| `Barras` | `components/datos/Barras.tsx` | Comparar magnitudes entre cosas con nombre. `destacado` va en ember. |
| `Proporcion` | `components/datos/Proporcion.tsx` | Cómo se reparte un total (sentimiento, share de voz). |
| `Lineas` | `components/datos/Lineas.tsx` | Evolución en el tiempo, con cruz que sigue al mouse y a las flechas. Un solo eje, siempre. |
| `Columnas` | `components/datos/Columnas.tsx` | Por categoría o período, apiladas o lado a lado. |
| `Leyenda` | `components/datos/Leyenda.tsx` | Siempre con dos series o más. |
| `Panel` | `components/ui/Panel.tsx` | La tarjeta de un tablero. `oscuro` para el objeto que la pantalla muestra, uno por pantalla como mucho. |
| `Tabla`, `ordenar` | `components/ui/Tabla.tsx` | Comparar valores entre filas (precios, métricas). Para listas de cosas que se abren, las filas de lista del sistema. |
| `SelectorMultiple` | `components/ui/SelectorMultiple.tsx` | Filtrar por varias opciones; vacío es "todas". |
| `Select`, `Switch`, `Notice` | `components/ui/` | Traídos de creative-check. |
| `IconoDePlataforma`, `nombreDePlataforma` | `components/ui/Plataforma.tsx` | Instagram, TikTok, Facebook, YouTube, X, WhatsApp, Email a trazo, sin colores de marca. |
| `Splash`, `MensajeCentral`, `ErrorEnLinea` | `components/layout/Estados.tsx` | Esperar la sesión, pantallas de estado, una sección que no cargó. |
| `SelectorDeEspacio` | `components/layout/SelectorDeEspacio.tsx` | El cliente, la marca o la empresa: un contexto arriba del riel, no un campo. |
| `MenuDeCuenta` | `components/layout/MenuDeCuenta.tsx` | La cuenta al pie del riel. |
| `Shell` con `nav`, `arriba`, `abajo` | `components/layout/Shell.tsx` | Grupos en el riel (`grupo` en cada ítem), selector arriba, cuenta abajo, y "Más" en la barra del celular cuando hay más de cinco secciones. |
| `BarrasDivergentes` | `components/datos/BarrasDivergentes.tsx` | Una diferencia con signo entre cosas con nombre (más caro o más barato que otro), desde un cero central. `tono` pass/fail cuando el signo es un estado. |
| `Delta` | `components/datos/Delta.tsx` | La variación de `Cifra` del tamaño de una celda: flecha, porcentaje y tono de estado. |
| `Tabla` con `grupo` | `components/ui/Tabla.tsx` | Filas partidas bajo un título (la categoría) sin repetir el encabezado. |
| `EsqueletoDeTabla` | `components/ui/EsqueletoDeTabla.tsx` | Lo que ocupa una `Tabla` mientras carga, con el alto real de las filas. |
| `Contenedor` | `components/layout/Contenedor.tsx` | La canaleta y el ancho de página para las secciones debajo de `PageHeader`. |

La guía viva está en `/v2/sistema` (solo en desarrollo): cada pieza, en claro y
en el escenario.

## Gráficos

- Van adentro de un `Panel` (papel levantado): la paleta está validada contra ese fondo.
- Una sola serie, un solo color (`dato-1`). Nunca pintar barras según su valor.
- Sentimiento: `SENTIMIENTO.positivo/neutral/negativo` (son estados). Marcas o plataformas: `coloresPorEntidad`.
- Nunca dos ejes Y. Dos medidas de escala distinta van en dos gráficos.
- Cuando lo que importa es un número, el número es el gráfico: `Cifra`.
- Los filtros van en una fila arriba de lo que filtran, nunca adentro de un panel, y filtran todo lo de abajo.

## Correr

```bash
npm install
npm run dev          # http://localhost:5393/v2/
npm run verificar    # typecheck, lint del sistema, voz, tests y build
```

`PROXY_API` apunta el `/api` del servidor de desarrollo a otra API.
