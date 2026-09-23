import { Router } from 'express';

export function configRoutes({ config }) {
  const router = Router();

  router.get('/', (req, res) => {
    res.json({ currency: config.currency, env: config.env });
  });

  return router;
}
