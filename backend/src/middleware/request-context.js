import { randomUUID } from 'node:crypto';
import { runWithRequestContext, updateRequestContext } from '../utils/request-context.js';

export function requestContext(req, res, next) {
  const originalUrl = req.originalUrl || req.url || '';
  const normalizedPath = typeof originalUrl === 'string' ? originalUrl.split('?')[0] : '';
  const startedAt = Date.now();

  const context = {
    requestId: randomUUID(),
    method: req.method,
    path: normalizedPath || originalUrl || '',
    userId: req.user?.id ?? null
  };

  runWithRequestContext(context, () => {
    res.on('finish', () => {
      updateRequestContext({
        userId: req.user?.id ?? null,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt
      });
    });

    next();
  });
}
