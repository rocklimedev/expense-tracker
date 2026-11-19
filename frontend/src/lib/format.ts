export function money(value: number | string | null | undefined, currency = 'INR') {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(n);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
