import { createWorker } from 'tesseract.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export class LocalOcrEngine {
  constructor({ config }) {
    this.config = config;
    this.workers = new Map();
  }

  async getWorker(language) {
    if (this.workers.has(language)) return this.workers.get(language);
    const options = {};
    if (this.config.ocrLangPath) options.langPath = this.config.ocrLangPath;
    if (this.config.ocrCachePath) options.cachePath = this.config.ocrCachePath;
    const worker = await createWorker(language, 1, options);
    this.workers.set(language, worker);
    return worker;
  }

  async extractText({ buffer, mimeType, fileName, language = 'spa' }) {
    if (mimeType === 'application/pdf') {
      return this.extractPdfText(buffer);
    }
    const worker = await this.getWorker(language);
    const { data } = await worker.recognize(buffer);
    return (data.text || '').trim();
  }

  async extractPdfText(buffer) {
    const doc = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
    try {
      const lines = [];
      for (let p = 1; p <= doc.numPages; p += 1) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        lines.push(...reconstructLines(content.items));
      }
      return lines.join('\n').trim();
    } finally {
      doc.cleanup();
    }
  }
}

function reconstructLines(items) {
  const rows = new Map();
  for (const item of items) {
    if (typeof item.str !== 'string' || item.str.trim() === '') continue;
    const y = Math.round(item.transform[5] / 3);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(item);
  }

  const lines = [];
  for (const rowItems of [...rows.values()].sort((a, b) => b[0].transform[5] - a[0].transform[5])) {
    rowItems.sort((a, b) => a.transform[4] - b.transform[4]);
    const line = rowItems.map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim();
    if (line) lines.push(line);
  }
  return lines;
}
