import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler.js';

export function memberRoutes({ memberService, contractService, forecastService }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    res.json(await memberService.list());
  }));

  router.get('/:id/forecast', asyncHandler(async (req, res) => {
    const months = Math.max(1, Math.min(60, Number.parseInt(req.query.months, 10) || 12));
    await memberService.get(req.params.id);
    const contracts = await contractService.listByMember(req.params.id);
    res.json(forecastService.forecast(contracts, { months }));
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
