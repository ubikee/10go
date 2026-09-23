import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function dashboardRoutes({ dashboardService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await dashboardService.build());
  }));

  return router;
}
