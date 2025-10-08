import { UnauthorizedError } from '../utils/errors.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/async-handler.js';
import { getTokenPayloadForUser } from '../services/token-version.js';
import { updateRequestContext } from '../utils/request-context.js';

export const authenticate = asyncHandler(async (req, res, next) => {
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

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return next(new UnauthorizedError());
  }

  const current = await getTokenPayloadForUser(payload.id);
  if (current.tokenVersion !== payload.tokenVersion) {
    return next(new UnauthorizedError());
  }

  req.user = current;
  updateRequestContext({ userId: current.id });
  return next();
});
