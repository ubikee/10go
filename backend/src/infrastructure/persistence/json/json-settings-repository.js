import fs from 'node:fs/promises';
import path from 'node:path';

export class JsonSettingsRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async read() {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async save(settings) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(settings, null, 2));
  }
}
