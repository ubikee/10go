import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function contractRoutes({ contractService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await contractService.list());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await contractService.get(req.params.id));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const contract = await contractService.create(req.body);
    res.status(201).json(contract);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    res.json(await contractService.update(req.params.id, req.body));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    res.json(await contractService.remove(req.params.id));
  }));

  return router;
}
