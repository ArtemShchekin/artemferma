import { validationResult } from 'express-validator';
import { ValidationError } from './errors.js';

export function assertValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError();
  }
}