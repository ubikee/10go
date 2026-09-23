import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { config } from '../../config/index.js';
import { createRepositories } from '../persistence/index.js';
import { buildContainer } from '../../application/index.js';
import { apiRoutes } from './routes/index.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

export async function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  const repositories = await createRepositories(config);
  const container = buildContainer({ repositories, config });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', persistence: config.persistence, currency: config.currency });
  });

  app.use('/api', apiRoutes(container));

  // 404 para rutas del API (JSON) antes de servir la SPA
  app.use('/api', notFound);

  // Sirve el frontend compilado (mismo proceso, mismo puerto)
  const distDir = path.resolve(config.backendRoot, '..', 'frontend', 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
