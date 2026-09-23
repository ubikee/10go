import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function carRoutes({ carService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await carService.list());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await carService.get(req.params.id));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const car = await carService.create(req.body);
    res.status(201).json(car);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    res.json(await carService.update(req.params.id, req.body));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    res.json(await carService.remove(req.params.id));
  }));

  return router;
}
