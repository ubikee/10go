import { Router } from 'express';
import { configRoutes } from './config-routes.js';
import { memberRoutes } from './member-routes.js';
import { houseRoutes } from './house-routes.js';
import { contractRoutes } from './contract-routes.js';
import { forecastRoutes } from './forecast-routes.js';
import { dashboardRoutes } from './dashboard-routes.js';

export function apiRoutes(container) {
  const router = Router();

  router.use('/config', configRoutes(container));
  router.use('/members', memberRoutes(container));
  router.use('/houses', houseRoutes(container));
  router.use('/contracts', contractRoutes(container));
  router.use('/forecast', forecastRoutes(container));
  router.use('/dashboard', dashboardRoutes(container));

  return router;
}
