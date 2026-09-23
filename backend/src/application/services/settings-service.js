import { ValidationError } from '../../shared/errors.js';

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
  return settings;
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
