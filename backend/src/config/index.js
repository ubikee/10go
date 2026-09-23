import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..', '..');

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.resolve(backendRoot, p);
}

// La carpeta de datos se puede sacar fuera de la app (DATA_DIR) para que las
// nuevas releases no pisen la base de datos.
const dataDir = process.env.DATA_DIR
  ? resolvePath(process.env.DATA_DIR)
  : path.join(backendRoot, 'data');

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 4000),
  currency: process.env.CURRENCY || 'EUR',
  backendRoot,
  dataDir,
  databasePath: process.env.DATABASE_PATH
    ? resolvePath(process.env.DATABASE_PATH)
    : path.join(dataDir, '10go.sqlite'),
  persistence: process.env.FORCE_PERSISTENCE
    || (process.env.NODE_ENV === 'production' ? 'sqlite' : 'json'),
  settingsPath: path.join(dataDir, 'settings.json'),
  invoicesDir: path.join(dataDir, 'invoices'),
  ocrLangPath: process.env.OCR_LANG_PATH ? resolvePath(process.env.OCR_LANG_PATH) : null,
  ocrCachePath: process.env.OCR_CACHE_PATH
    ? resolvePath(process.env.OCR_CACHE_PATH)
    : path.join(dataDir, 'ocr-cache'),
};

export default config;
