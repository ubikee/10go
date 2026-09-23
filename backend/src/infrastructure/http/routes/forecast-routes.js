import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function forecastRoutes({ forecastService, contractService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const months = Math.max(1, Math.min(60, Number.parseInt(req.query.months, 10) || 12));
    const contracts = await contractService.list();
    res.json(forecastService.forecast(contracts, { months }));
  }));

  return router;
}
