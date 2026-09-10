const PERU_TZ = 'America/Lima';

/** Format ISO timestamps for display in Peru local time. */
export function formatPeruDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return 'N/A';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('es-PE', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/** YYYY-MM-DD in America/Lima for an ISO timestamp. */
export function peruDateKey(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** HH:mm in America/Lima for an ISO timestamp. */
export function peruTimeLabel(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export { PERU_TZ };
