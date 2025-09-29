import { logHttpEvent } from '../logging/index.js';
import { redactProfilePayload, shouldRedactProfileLogs } from '../utils/redact.js';

function serializeForLog(value, { allowEmptyObject = false } = {}) {
  if (value === undefined || value === null) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]' &&
    !allowEmptyObject &&
    Object.keys(value).length === 0
  ) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch (_error) {
    return '[unserializable payload]';
  }
}

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

  const originalUrl = req.originalUrl || req.url || '';
  const normalizedPath = typeof originalUrl === 'string' ? originalUrl.split('?')[0] : '';
  const shouldRedactProfile = shouldRedactProfileLogs(req.method, normalizedPath);


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

  const shouldSkip = normalizedPath === '/api/health';

  const baseRequestPayload = shouldSkip
    ? null
    : {
        method: req.method,
        path: originalUrl,
        userId: req.user?.id || null,
        ip
      };

  let requestPayload = null;
  if (baseRequestPayload) {
    requestPayload = { ...baseRequestPayload };

    const bodyForLogging = shouldRedactProfile ? redactProfilePayload(req.body) : req.body;
    const requestBody = serializeForLog(bodyForLogging, { allowEmptyObject: true });
    if (requestBody !== null) {
      requestPayload.requestBody = requestBody;
    }

    const requestQuery = serializeForLog(shouldRedactProfile ? redactProfilePayload(req.query) : req.query);
    if (requestQuery !== null) {
      requestPayload.requestQuery = requestQuery;
    }

    const requestParams = serializeForLog(shouldRedactProfile ? redactProfilePayload(req.params) : req.params);
    if (requestParams !== null) {
      requestPayload.requestParams = requestParams;
    }

    const requestLogResult = logHttpEvent('ClientsGatewayRequest', { ...requestPayload });
    if (requestLogResult && typeof requestLogResult.catch === 'function') {
      requestLogResult.catch((error) => {
        console.error('Failed to log request start:', error);
      });
    }
  }

  res.on('finish', () => {
    try {
      const durationMs = Date.now() - started;
      if (shouldSkip) {
        return;
      }
      const userId = req.user?.id || null;

      const responseBody = shouldRedactProfile ? redactProfilePayload(capturedResponse) : capturedResponse;

      const combinedPayload = {
        ...((requestPayload && {
          ...requestPayload,
          userId,
          ip
        }) || {
          method: req.method,
          path: originalUrl,
          userId,
          ip
        }),
        status: res.statusCode,
        durationMs,
        responseBody: responseBody ?? null
      };

      const result = logHttpEvent('ClientsGatewayResponse', combinedPayload);
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