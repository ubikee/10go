import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function memberRoutes({ memberService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await memberService.list());
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(await memberService.get(req.params.id));
  }));

  router.post('/', asyncHandler(async (req, res) => {
    const member = await memberService.create(req.body);
    res.status(201).json(member);
  }));

  router.put('/:id', asyncHandler(async (req, res) => {
    res.json(await memberService.update(req.params.id, req.body));
  }));

  router.delete('/:id', asyncHandler(async (req, res) => {
    res.json(await memberService.remove(req.params.id));
  }));

  return router;
}
