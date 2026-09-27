// Fechas relativas en los dos sentidos. Una invitación vence en el futuro: con
// solo el pasado, todas decían "vence recién".
export function relativo(iso: string, ahora = Date.now()): string {
  const d = new Date(iso);
  const diff = d.getTime() - ahora;
  const futuro = diff > 0;
  const m = Math.round(Math.abs(diff) / 60_000);

  const cuanto = (() => {
    if (m < 60) return `${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h`;
    const dias = Math.round(h / 24);
    return dias < 30 ? `${dias} d` : null;
  })();

  if (m < 1) return futuro ? "en un momento" : "recién";
  if (!cuanto) return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  return futuro ? `en ${cuanto}` : `hace ${cuanto}`;
}
