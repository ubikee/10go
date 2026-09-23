export const CONTRACT_TYPES = [
  { value: 'rental', label: 'Alquiler' },
  { value: 'supply', label: 'Suministro' },
  { value: 'employment', label: 'Empleo / Nómina' },
  { value: 'freelance', label: 'Autónomo / Freelance' },
  { value: 'insurance', label: 'Seguro' },
  { value: 'subscription', label: 'Suscripción' },
  { value: 'loan', label: 'Préstamo' },
  { value: 'other', label: 'Otro' },
];

export const AMOUNT_TYPES = [
  { value: 'fixed', label: 'Fijo (recurrente)' },
  { value: 'variable', label: 'Variable (según facturas)' },
];

export const CONTRACT_ROLES = [
  { value: 'tenant', label: 'Inquilino' },
  { value: 'landlord', label: 'Casero' },
];

export const DIRECTIONS = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
];

export const RECURRENCES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'one_time', label: 'Puntual' },
];

export const CONTRACT_STATUSES = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'archived', label: 'Archivado' },
];

export const HOUSE_TYPES = [
  { value: 'owned', label: 'En propiedad' },
  { value: 'rented', label: 'Alquilada' },
  { value: 'other', label: 'Otro' },
];

export const SUPPLY_SUBTYPES = [
  { value: 'electricity', label: 'Luz' },
  { value: 'water', label: 'Agua' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet/ADSL' },
  { value: 'mobile', label: 'Móvil' },
  { value: 'community', label: 'Comunidad' },
  { value: 'other', label: 'Otro' },
];

export const EXPENSE_CATEGORIES = [
  'comida',
  'supermercado',
  'ropa',
  'restauración',
  'ocio',
  'salud',
  'transporte',
  'gasolina',
  'reparaciones',
  'hogar',
  'educación',
  'otros',
];

export const LABELS = {
  type: Object.fromEntries(CONTRACT_TYPES.map((t) => [t.value, t.label])),
  role: Object.fromEntries(CONTRACT_ROLES.map((t) => [t.value, t.label])),
  direction: Object.fromEntries(DIRECTIONS.map((t) => [t.value, t.label])),
  recurrence: Object.fromEntries(RECURRENCES.map((t) => [t.value, t.label])),
  status: Object.fromEntries(CONTRACT_STATUSES.map((t) => [t.value, t.label])),
  amountType: Object.fromEntries(AMOUNT_TYPES.map((t) => [t.value, t.label])),
  houseType: Object.fromEntries(HOUSE_TYPES.map((t) => [t.value, t.label])),
  subtype: Object.fromEntries(SUPPLY_SUBTYPES.map((t) => [t.value, t.label])),
};

export function labelOf(category, value) {
  return LABELS[category]?.[value] ?? value ?? '—';
}
