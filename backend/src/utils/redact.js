const PROFILE_SENSITIVE_FIELDS = new Set([
  'firstName',
  'lastName',
  'middleName',
  'nickname',
  'passport'
]);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function redactValue(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      if (PROFILE_SENSITIVE_FIELDS.has(key) && nestedValue !== null && nestedValue !== undefined) {
        acc[key] = '***';
      } else {
        acc[key] = redactValue(nestedValue);
      }
      return acc;
    }, {});
  }

  return value;
}

export function redactProfilePayload(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      const redacted = redactValue(parsed);
      return JSON.stringify(redacted);
    } catch (error) {
      return payload;
    }
  }

  return redactValue(payload);
}

export function shouldRedactProfileLogs(method, normalizedPath) {
  return method === 'PUT' && normalizedPath === '/api/profile';
}