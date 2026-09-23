import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function houseRoutes({ houseService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await houseService.list());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await houseService.get(req.params.id));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const house = await houseService.create(req.body);
    res.status(201).json(house);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    res.json(await houseService.update(req.params.id, req.body));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    res.json(await houseService.remove(req.params.id));
  }));

  return router;
}
