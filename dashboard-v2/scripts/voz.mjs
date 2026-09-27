// Que la interfaz no mezcle voces. Busca en el código (sin comentarios, que
// van siempre en voseo) formas de la voz que el proyecto NO eligió. Es una red,
// no un corrector: atrapa las formas comunes y deja pasar las ambiguas
// ("carga", "busca") para no gritar en falso.
//
//   node scripts/voz.mjs            usa la voz de .receta.json (vos si no hay)
//   node scripts/voz.mjs --voz tu
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const VOSEO = [
  "entrá",
  "probá",
  "volvé",
  "elegí",
  "arrastrá",
  "soltá",
  "subí",
  "creá",
  "abrí",
  "cargá",
  "escribí",
  "contanos",
  "contá",
  "avisanos",
  "escribinos",
  "pasá",
  "mirá",
  "tocá",
  "usá",
  "hacé",
  "poné",
  "sacá",
  "borrá",
  "guardá",
  "cancelá",
  "confirmá",
  "revisá",
  "completá",
  "agregá",
  "buscá",
  "seguí",
  "esperá",
  "recargá",
  "cerrá",
  "copiá",
  "pegá",
  "descargá",
  "compartí",
  "invitá",
  "pedile",
  "mandale",
  "mandáselo",
  "fijate",
  "dejá",
  "elegila",
  "elegilo",
  "reemplazalo",
  "tenés",
  "podés",
  "querés",
  "sabés",
  "sos",
  "necesitás",
  "pertenecés",
  "preferís",
  "elegís",
  "venís",
  "decís",
  "escribís",
  "componés",
  "descargás",
  "cambiás",
  "encontrás",
  "buscás",
  "dejás",
  "entrás",
  "creás",
  "guardás",
  "subís",
];

const TUTEO = [
  "tienes",
  "puedes",
  "quieres",
  "sabes",
  "eres",
  "necesitas",
  "perteneces",
  "prefieres",
  "vienes",
  "dices",
  "escribes",
  "compones",
  "cambias",
  "encuentras",
  "dejas",
  "entras",
  "creas",
  "guardas",
  "subes",
  "cuéntanos",
  "avísanos",
  "escríbenos",
  "inténtalo",
  "pruébalo",
  "elígelo",
  "elígela",
  "suéltalo",
  "suéltala",
  "pídele",
  "mándale",
  "mándaselo",
  "fíjate",
  "reemplázalo",
  "prueba de nuevo",
  "vuelve a cargar",
  "vuelve a intentar",
  "elige un",
  "elige una",
  "arrastra una",
  "arrastra un",
];

function voz() {
  const i = process.argv.indexOf("--voz");
  return i >= 0 ? process.argv[i + 1] : "vos";
}

// Saca comentarios de // y /* */ sin tocar lo que está adentro de un string.
function sinComentarios(codigo) {
  let salida = "";
  let i = 0;
  let comilla = null;
  while (i < codigo.length) {
    const c = codigo[i];
    const sig = codigo[i + 1];
    if (comilla) {
      salida += c;
      if (c === "\\") {
        salida += sig ?? "";
        i += 2;
        continue;
      }
      if (c === comilla) comilla = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      comilla = c;
      salida += c;
      i++;
      continue;
    }
    if (c === "/" && sig === "/") {
      while (i < codigo.length && codigo[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && sig === "*") {
      const fin = codigo.indexOf("*/", i + 2);
      const bloque = codigo.slice(i, fin === -1 ? codigo.length : fin + 2);
      salida += bloque.replace(/[^\n]/g, " ");
      i += bloque.length;
      continue;
    }
    salida += c;
    i++;
  }
  return salida;
}

function* archivos(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", "dist", "generated", "banco"].includes(e.name)) continue;
      yield* archivos(ruta);
    } else if (
      /\.(tsx?|mts)$/.test(e.name) &&
      !/\.test\.tsx?$/.test(e.name) &&
      !/\.tu\.ts$/.test(e.name)
    ) {
      yield ruta;
    }
  }
}

const elegida = voz();
const ajenas = elegida === "tu" ? VOSEO : TUTEO;
const patron = new RegExp(
  `(?<![\\p{L}])(${ajenas.map((w) => w.replace(/ /g, "\\s+")).join("|")})(?![\\p{L}])`,
  "giu",
);

const hallazgos = [];
for (const app of ["src"]) {
  for (const archivo of archivos(path.join(RAIZ, app))) {
    const lineas = sinComentarios(fs.readFileSync(archivo, "utf8")).split("\n");
    lineas.forEach((linea, n) => {
      for (const m of linea.matchAll(patron)) {
        hallazgos.push(`${path.relative(RAIZ, archivo)}:${n + 1}  "${m[1]}"`);
      }
    });
  }
}

if (hallazgos.length > 0) {
  console.error(
    `La interfaz habla de ${elegida === "tu" ? "tú" : "vos"}, pero aparecen formas de la otra voz:\n`,
  );
  for (const h of hallazgos) console.error(`  ${h}`);
  process.exitCode = 1;
} else {
  console.log(`Voz pareja: todo habla de ${elegida === "tu" ? "tú" : "vos"}.`);
}
