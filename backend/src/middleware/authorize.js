import { ForbiddenError } from '../utils/errors.js';

export function requireAdmin(req, _res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ForbiddenError());
  }

  return next();
}
