export function formatMoney(amount, currency = 'EUR', locale = 'es-ES') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function monthLabel(month) {
  if (!month) return '—';
  const [year, m] = month.split('-');
  return new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
}
