import fs from 'node:fs/promises';
import path from 'node:path';

export class JsonCollection {
  constructor(filePath) {
    this.filePath = filePath;
    this.rows = null;
  }

  async load() {
    if (this.rows !== null) return this.rows;
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      this.rows = JSON.parse(raw);
      if (!Array.isArray(this.rows)) this.rows = [];
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.rows = [];
      } else {
        throw err;
      }
    }
    return this.rows;
  }

  async persist() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.rows ?? [], null, 2));
  }

  async seed(initial) {
    const rows = await this.load();
    if (rows.length === 0) {
      this.rows = initial.map((r) => ({ ...r }));
      await this.persist();
    }
  }
}
