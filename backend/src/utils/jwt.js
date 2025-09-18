import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export function signToken(payload) {
  return jwt.sign({ id: payload.id, email: payload.email }, config.jwtSecret, { expiresIn: '7d' });
}