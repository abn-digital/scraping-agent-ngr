// "1 notas" delata una plantilla. Para los casos del castellano que no son
// agregar una s ("imagen", "imágenes"), se pasa la forma plural.
export function plural(n: number, uno: string, varios = `${uno}s`): string {
  return `${n} ${n === 1 ? uno : varios}`;
}
