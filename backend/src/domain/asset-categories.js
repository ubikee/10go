export const AssetCategories = Object.freeze({
  informatica: { label: 'Informática', rate: 0.26 },
  mobiliario: { label: 'Mobiliario y enseres', rate: 0.10 },
  maquinaria: { label: 'Maquinaria', rate: 0.12 },
  vehiculo: { label: 'Vehículo', rate: 0.16 },
  herramientas: { label: 'Herramientas y útiles', rate: 0.30 },
  otros: { label: 'Otros', rate: 0.12 },
});

export const DEFAULT_AMORTIZATION_RATE = 0.12;

export function defaultRateFor(category) {
  return AssetCategories[category]?.rate ?? DEFAULT_AMORTIZATION_RATE;
}
