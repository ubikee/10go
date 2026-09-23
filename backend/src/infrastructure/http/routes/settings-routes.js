import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function settingsRoutes({ settingsService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await settingsService.get());
  }));

  router.put('/', asyncHandler(async (req, res) => {
    res.json(await settingsService.update(req.body ?? {}));
  }));

  return router;
}
