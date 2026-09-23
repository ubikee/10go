import fs from 'node:fs/promises';
import path from 'node:path';

const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/tiff': '.tiff',
  'image/gif': '.gif',
};

export class DocumentStore {
  constructor({ dataDir }) {
    this.root = path.join(dataDir, 'invoices');
  }

  extensionFor(mimeType, originalName) {
    if (EXT_BY_MIME[mimeType]) return EXT_BY_MIME[mimeType];
    const ext = path.extname(originalName || '').toLowerCase();
    return ext && ext.length <= 10 ? ext : '.bin';
  }

  relativePath(contractId, transactionId, ext) {
    return path.join('invoices', contractId, `${transactionId}${ext}`);
  }

  async save({ contractId, transactionId, buffer, originalName, mimeType }) {
    const ext = this.extensionFor(mimeType, originalName);
    const rel = this.relativePath(contractId, transactionId, ext);
    const abs = this.resolve(rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);
    return rel;
  }

  resolve(relativePath) {
    const abs = path.resolve(this.root, relativePath);
    if (!abs.startsWith(this.root + path.sep) && abs !== this.root) {
      throw new Error('Ruta de documento no permitida');
    }
    return abs;
  }

  async read(relativePath) {
    return fs.readFile(this.resolve(relativePath));
  }

  async delete(relativePath) {
    try {
      await fs.unlink(this.resolve(relativePath));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
