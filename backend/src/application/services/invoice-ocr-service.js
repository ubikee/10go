import { ValidationError } from '../../shared/errors.js';
import { parseInvoiceText } from '../../domain/services/invoice-parser.js';

export class InvoiceOcrService {
  constructor({ engines, settingsService }) {
    this.engines = engines;
    this.settingsService = settingsService;
  }

  async isEnabled() {
    const settings = await this.settingsService.get();
    return settings.invoiceOcr.enabled;
  }

  async extract({ buffer, mimeType, fileName }) {
    const settings = await this.settingsService.get();
    const ocr = settings.invoiceOcr;

    if (!ocr.enabled) {
      throw new ValidationError('El módulo OCR de facturas está desactivado');
    }

    let text;
    if (ocr.engine === 'cloud') {
      if (!ocr.cloud.apiKey) {
        throw new ValidationError('Configura la API key de Google Vision en los ajustes');
      }
      text = await this.engines.cloud.extractText({ buffer, apiKey: ocr.cloud.apiKey });
    } else {
      text = await this.engines.local.extractText({
        buffer,
        mimeType,
        fileName,
        language: ocr.language,
      });
    }

    const parsed = parseInvoiceText(text);
    return {
      engine: ocr.engine,
      invoiceNumber: parsed.invoiceNumber,
      amount: parsed.amount,
      period: parsed.period,
      date: parsed.date,
      baseAmount: parsed.baseAmount,
      vatAmount: parsed.vatAmount,
      vatRate: parsed.vatRate,
      withholdingAmount: parsed.withholdingAmount,
      withholdingRate: parsed.withholdingRate,
      holder: parsed.holder,
      text,
    };
  }
}
