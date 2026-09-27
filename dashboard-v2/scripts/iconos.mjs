// Los PNG del ícono salen de public/favicon.svg: el de 180 es el que iOS pone
// en la pantalla de inicio (no lee SVG), y el de 32 y el de 512 son para los
// navegadores y lugares que tampoco lo leen. Transparentes, como en creativos.
// Se regeneran cuando cambia la marca: npm run iconos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const PUBLICO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const svg = fs.readFileSync(path.join(PUBLICO, "favicon.svg"));

for (const lado of [32, 180, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: lado } }).render().asPng();
  fs.writeFileSync(path.join(PUBLICO, `favicon-${lado}.png`), png);
  console.log(`public/favicon-${lado}.png`);
}
