import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..', '..');

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 4000),
  currency: process.env.CURRENCY || 'EUR',
  backendRoot,
  dataDir: path.join(backendRoot, 'data'),
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(backendRoot, process.env.DATABASE_PATH)
    : path.join(backendRoot, 'data', '10go.sqlite'),
  persistence: process.env.FORCE_PERSISTENCE
    || (process.env.NODE_ENV === 'production' ? 'sqlite' : 'json'),
};

export default config;
