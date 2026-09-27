// `nombre` solo sirve para un blob o una URL del mismo origen: el atributo
// `download` se ignora con una URL de otro origen (una firmada del bucket, por
// ejemplo), y ahí el nombre lo tiene que mandar el servidor en el
// Content-Disposition. Sin eso, el navegador abre el archivo en vez de bajarlo.
export function descargar(href: string, nombre?: string): void {
  const a = document.createElement("a");
  a.href = href;
  if (nombre) a.download = nombre;
  a.click();
}

// Un blob es del mismo origen, así que acá el nombre sí manda. La URL se suelta
// enseguida: cada createObjectURL retiene el blob hasta que se revoca, y un ZIP
// de treinta archivos no es poco.
export function descargarBlob(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  descargar(url, nombre);
  URL.revokeObjectURL(url);
}
