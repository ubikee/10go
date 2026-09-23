import { ValidationError } from '../../shared/errors.js';

export const DEFAULT_IRPF_BRACKETS = [
  { upTo: 12450, rate: 0.19 },
  { upTo: 20200, rate: 0.24 },
  { upTo: 35200, rate: 0.30 },
  { upTo: 60000, rate: 0.37 },
  { upTo: 300000, rate: 0.45 },
  { upTo: null, rate: 0.47 },
];

export const DEFAULT_SETTINGS = {
  invoiceOcr: {
    enabled: true,
    engine: 'local',
    autoSave: false,
    language: 'spa',
    cloud: {
      provider: 'google',
      apiKey: '',
    },
  },
  irpf: {
    minimoPersonal: 5550,
    brackets: DEFAULT_IRPF_BRACKETS,
  },
};

const ENGINES = ['local', 'cloud'];

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function deepMerge(base, override) {
  const result = { ...base };
  if (!isObject(override)) return result;
  for (const key of Object.keys(override)) {
    if (isObject(base[key]) && isObject(override[key])) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

export function validateSettings(settings) {
  const ocr = settings?.invoiceOcr;
  if (!isObject(ocr)) throw new ValidationError('Configuración invoiceOcr inválida');
  if (typeof ocr.enabled !== 'boolean') throw new ValidationError('invoiceOcr.enabled debe ser booleano');
  if (!ENGINES.includes(ocr.engine)) throw new ValidationError(`invoiceOcr.engine debe ser ${ENGINES.join(' o ')}`);
  if (typeof ocr.autoSave !== 'boolean') throw new ValidationError('invoiceOcr.autoSave debe ser booleano');
  if (typeof ocr.language !== 'string' || !ocr.language) throw new ValidationError('invoiceOcr.language inválido');
  if (!isObject(ocr.cloud) || ocr.cloud.provider !== 'google') {
    throw new ValidationError('invoiceOcr.cloud.provider debe ser "google"');
  }
  if (typeof ocr.cloud.apiKey !== 'string') throw new ValidationError('invoiceOcr.cloud.apiKey debe ser texto');
  validateIrpf(settings.irpf);
  return settings;
}

function validateIrpf(irpf) {
  if (!isObject(irpf) || !Array.isArray(irpf.brackets) || irpf.brackets.length === 0) {
    throw new ValidationError('Configuración irpf.brackets inválida');
  }
  const minimo = Number(irpf.minimoPersonal);
  if (irpf.minimoPersonal == null || Number.isNaN(minimo) || minimo < 0) {
    throw new ValidationError('irpf.minimoPersonal debe ser un número positivo');
  }
  for (const bracket of irpf.brackets) {
    if (!isObject(bracket)) throw new ValidationError('Tramo de IRPF inválido');
    if (bracket.upTo != null && (Number.isNaN(Number(bracket.upTo)) || Number(bracket.upTo) <= 0)) {
      throw new ValidationError('El límite del tramo de IRPF debe ser un número positivo');
    }
    const rate = Number(bracket.rate);
    if (Number.isNaN(rate) || rate < 0 || rate > 1) {
      throw new ValidationError('El tipo del tramo de IRPF debe estar entre 0 y 1');
    }
  }
}

export class SettingsService {
  constructor({ settingsRepository }) {
    this.settingsRepository = settingsRepository;
  }

  async get() {
    const persisted = await this.settingsRepository.read();
    return deepMerge(DEFAULT_SETTINGS, persisted);
  }

  async update(input) {
    const current = await this.get();
    const next = validateSettings(deepMerge(current, input));
    await this.settingsRepository.save(next);
    return next;
  }
}
