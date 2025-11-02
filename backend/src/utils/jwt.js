import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const buildPayload = (payload) => ({
  id: payload.id,
  email: payload.email,
  role: payload.role,
  tokenVersion: payload.tokenVersion
});

export function signAccessToken(payload) {
  return jwt.sign(buildPayload(payload), config.jwtSecret, {
    expiresIn: config.jwtAccessExpiresIn
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(buildPayload(payload), config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiresIn
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}