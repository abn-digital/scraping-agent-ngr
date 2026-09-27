import "./index.css";

const raiz = document.getElementById("root")!;

// La app y el sitio van en chunks separados: quien entra al sitio no baja la
// app entera, y al revés.
void import("./montar-app").then((m) => m.montar(raiz));
