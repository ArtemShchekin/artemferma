import { Router } from 'express';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { consumeMaturityNotifications } from '../services/maturity-consumer.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.post(
  '/email',
  asyncHandler(async (req, res) => {
    logApiRequest('Maturity notifications pull requested', {
      event: 'garden.maturity.email',
      method: 'POST',
      path: '/api/email',
      IntegrationName: 'Email'
    });

    const processed = await consumeMaturityNotifications();
    const response = { processed };

    res.json(response);
    logApiResponse('Maturity notifications pull completed', {
      event: 'garden.maturity.email',
      method: 'POST',
      path: '/api/email',
      status: res.statusCode,
      IntegrationName: 'Email',
      processed,
      response
    });
  })
);

export default router;
