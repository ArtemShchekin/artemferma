import { UnauthorizedError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req, res, next) {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const originalUrl = req.originalUrl || req.url || '';
  if (typeof originalUrl === 'string' && originalUrl.startsWith('/api/docs')) {
    return next();
  }

  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (type !== 'Bearer' || !token) {
    return next(new UnauthorizedError());
  }

  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch (error) {
    return next(new UnauthorizedError());
  }
}