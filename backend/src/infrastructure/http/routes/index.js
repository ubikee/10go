import { Router } from 'express';
import { configRoutes } from './config-routes.js';
import { settingsRoutes } from './settings-routes.js';
import { memberRoutes } from './member-routes.js';
import { houseRoutes } from './house-routes.js';
import { carRoutes } from './car-routes.js';
import { assetRoutes } from './asset-routes.js';
import { contractRoutes } from './contract-routes.js';
import { transactionRoutes } from './transaction-routes.js';
import { taxRoutes } from './tax-routes.js';
import { ocrRoutes } from './ocr-routes.js';
import { forecastRoutes } from './forecast-routes.js';
import { dashboardRoutes } from './dashboard-routes.js';

export function apiRoutes(container) {
  const router = Router();

  router.use('/config', configRoutes(container));
  router.use('/settings', settingsRoutes(container));
  router.use('/members', memberRoutes(container));
  router.use('/houses', houseRoutes(container));
  router.use('/cars', carRoutes(container));
  router.use('/assets', assetRoutes(container));
  router.use('/contracts', contractRoutes(container));
  router.use(transactionRoutes(container));
  router.use('/taxes', taxRoutes(container));
  router.use('/ocr', ocrRoutes(container));
  router.use('/forecast', forecastRoutes(container));
  router.use('/dashboard', dashboardRoutes(container));

  return router;
}
