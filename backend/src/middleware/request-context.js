 codex/add-database-logging-for-sql-queries-4wtrbq

import crypto from 'crypto';
import { runWithRequestContext, updateRequestContext } from '../utils/request-context.js';

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const buffer = crypto.randomBytes(16);
  buffer[6] = (buffer[6] & 0x0f) | 0x40;
  buffer[8] = (buffer[8] & 0x3f) | 0x80;

  const hex = buffer.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function requestContext(req, res, next) {
  const originalUrl = req.originalUrl || req.url || '';
  const normalizedPath = typeof originalUrl === 'string' ? originalUrl.split('?')[0] : '';
  const startedAt = Date.now();

  const context = {
    requestId: generateRequestId(),
 codex/add-database-logging-for-sql-queries-4wtrbq

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
