import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function taxRoutes({ taxService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(req.query.year, 10) || currentYear;
    const memberId = req.query.memberId || null;
    res.json(await taxService.summary(year, memberId));
  }));

  return router;
}
