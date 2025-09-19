import { logRequest } from '../logging/index.js';

export function requestLogger(req, res, next) {
  const started = Date.now();
  res.on('finish', () => {
    try {
      const durationMs = Date.now() - started;
      const xForwardedForHeader = req.headers?.['x-forwarded-for'];
      let ip = req.ip;

      if (xForwardedForHeader !== undefined && xForwardedForHeader !== null) {
        const headerValue = Array.isArray(xForwardedForHeader)
          ? xForwardedForHeader.find((value) => value)
          : xForwardedForHeader;

        if (headerValue !== undefined && headerValue !== null) {
          const forwardedIp = headerValue.toString().split(',')[0]?.trim();
          if (forwardedIp) {
            ip = forwardedIp;
          }
        }
      }
      const payload = {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs,
        userId: req.user?.id || null,
        ip
      };
      const result = logRequest(payload);
      if (result && typeof result.catch === 'function') {
        result.catch((error) => {
          console.error('Failed to log request:', error);
        });
      }
    } catch (error) {
      console.error('Unexpected error while logging request:', error);
    }
  });
  next();
}