import { createApp } from './infrastructure/http/app.js';
import { config } from './config/index.js';

const app = await createApp();

app.listen(config.port, () => {
  console.log(`[10go] API escuchando en http://localhost:${config.port}`);
  console.log(`[10go] Entorno: ${config.env} | Persistencia: ${config.persistence} | Moneda: ${config.currency}`);
});
