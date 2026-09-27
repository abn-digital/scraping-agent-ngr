# Voz

La voz del proyecto está en `.receta.json` (`voz`: `vos` o `tu`) y no se mezcla: `npm run voz` falla si aparece la otra. Los comentarios del código van siempre en castellano rioplatense; la voz rige lo que ve quien usa la app.

## Tono

- **Frases cortas y afirmativas.** Ningún signo de exclamación en toda la interfaz. "Subida. En unos segundos queda lista."
- **El porqué en el propio texto,** cuando la decisión no es obvia: "Se borra para todo el equipo. No se puede deshacer."
- **Consecuencias y tranquilidad** en toda acción destructiva o fallo: qué se pierde y qué queda. "La nota no se modificó."
- **"Se" impersonal** para lo que hace el sistema: "Se guarda en tres tamaños."
- **Primera persona plural** para la empresa, honesta sobre lo que falta: "Todavía no mandamos mails."
- **Errores con "No se pudo …"** y, si el back trae el motivo, el motivo.
- **Preguntas en vez de etiquetas** para campos abiertos: "¿Cómo se llama?", "¿Qué es?".
- **Vacíos:** "Ningún X todavía"; búsquedas: "No se encontraron X con "q"".
- **Botones con verbo y artículo,** que dicen exactamente qué va a pasar y cuánto: "Crear la nota", "Limpiar la búsqueda", "Subir 3 imágenes".
- **En curso:** gerundio con elipsis tipográfica: "Guardando…", "Subiendo…".
- **Oración con mayúscula inicial,** nunca Title Case, también en títulos.
- **Cuentas chicas en palabras:** "Sin notas todavía", "Una nota", "12 notas". Cuando la cuenta es un número, `plural()`: nunca "1 notas".
- **Lo optativo se marca, lo obligatorio no:** "Nombre (opcional)", con "(opcional)" en `text-ink-4` junto a la etiqueta.
- **El estado dice lo que va a pasar, no cómo se llama por dentro:** una fila de un lote detenido está "En pausa", no "En cola".

## Tipografía del texto

Separador `·`, dimensiones con `×` (`1080 × 1350`), rangos con raya corta (`21–40 de 312`), `—` para "sin valor", comillas rectas alrededor de nombres en títulos de confirmación, elipsis `…` (un carácter, no tres puntos).

## Dónde viven los textos

Los que vinieron con la plantilla y dependen de la voz están en `apps/web/src/lib/textos.ts` (y los del back en `apps/api/src/textos.ts`, si hay backend). Todo texto nuevo va inline, en la voz del proyecto. El lenguaje neutro ("Cerrar", "Guardar") no necesita nada especial.
