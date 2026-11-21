import { Router } from 'express';
import { config } from '../config';
import { ApiError, ok } from '../lib/http';

const router = Router();

router.post('/:provider', (req, res) => {
  if (config.webhookSecret) {
    const provided = req.get('x-webhook-secret') ?? req.query.token;
    if (provided !== config.webhookSecret) {
      throw new ApiError(401, 'Invalid webhook secret', 'UNAUTHORIZED');
    }
  }
  const provider = req.params.provider;
  console.log(`[webhook] ${provider} ${new Date().toISOString()}`, JSON.stringify(req.body ?? {}).slice(0, 2000));
  ok(res, { received: true, provider, receivedAt: new Date().toISOString() });
});

export default router;
