import { logRequest } from '../logging/index.js';

export function requestLogger(req, res, next) {
  const started = Date.now();
    let capturedResponse;

  const captureBody = (body) => {
    if (body === undefined || body === null) {
      return;
    }

    if (Buffer.isBuffer(body)) {
      capturedResponse = body.toString('utf8');
      return;
    }

    if (typeof body === 'string') {
      capturedResponse = body;
      return;
    }

    try {
      capturedResponse = JSON.stringify(body);
    } catch (error) {
      capturedResponse = '[unserializable response]';
    }
  };

  const originalJson = res.json.bind(res);
  res.json = function json(body) {
    captureBody(body);
    return originalJson(body);
  };

  const originalSend = res.send.bind(res);
  res.send = function send(body) {
    captureBody(body);
    return originalSend(body);
  };

  const originalEnd = res.end.bind(res);
  res.end = function end(...args) {
    if (args.length > 0 && args[0] !== undefined && args[0] !== null) {
      captureBody(args[0]);
    }
    return originalEnd.apply(res, args);
  };

  res.on('finish', () => {
    try {
      const durationMs = Date.now() - started;
      const xForwardedForHeader = req.headers?.['x-forwarded-for'];
      let ip = req.ip;
      const originalUrl = req.originalUrl || req.url || '';
      const normalizedPath = typeof originalUrl === 'string' ? originalUrl.split('?')[0] : '';

      if (normalizedPath === '/api/health') {
        return;
      }


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
        ip,
        responseBody: capturedResponse ?? null      };
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