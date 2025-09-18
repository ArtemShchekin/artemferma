import { logError } from '../logging/index.js';
import { HttpError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err instanceof HttpError
    ? err.status
    : typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;

  const expose = err instanceof HttpError ? err.expose : false;
  const message = expose ? err.message : 'Internal Server Error';

  logError('Request processing error', {
    event: status >= 500 ? 'error.unhandled' : 'error.handled',
    status,
    error: err.message,
    stack: err.stack
  });

  const payload = { error: message };
  if (expose && err.details) {
    payload.details = err.details;
  }

  res.status(status).json(payload);
}