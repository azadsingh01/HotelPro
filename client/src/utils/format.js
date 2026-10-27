export function formatCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';

  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(date);
}

export function todayDateInput() {
  const today = new Date();
  const localOffset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - localOffset).toISOString().slice(0, 10);
}

export function getNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00.000Z`);
  const end = new Date(`${checkOut}T00:00:00.000Z`);
  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}
