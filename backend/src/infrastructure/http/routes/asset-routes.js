import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function assetRoutes({ assetService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await assetService.list());
  }));

  router.get('/:id/schedule', asyncHandler(async (req, res) => {
    res.json(await assetService.schedule(req.params.id));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await assetService.get(req.params.id));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const asset = await assetService.create(req.body);
    res.status(201).json(asset);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    res.json(await assetService.update(req.params.id, req.body));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    res.json(await assetService.remove(req.params.id));
  }));

  return router;
}
