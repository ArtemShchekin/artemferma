import { query, queryOne } from '../db/pool.js';
import { UnauthorizedError } from '../utils/errors.js';
import { signAccessToken, signRefreshToken } from '../utils/jwt.js';

const toTokenPayload = (user) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  tokenVersion: user.token_version
});

async function loadUserTokenRow(userId) {
  const user = await queryOne('SELECT id, email, role, token_version FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function getTokenPayloadForUser(userId) {
  const user = await loadUserTokenRow(userId);
  return toTokenPayload(user);
}

export async function rotateTokenVersion(userId) {
  await query('UPDATE users SET token_version = token_version + 1 WHERE id = ?', [userId]);
  return getTokenPayloadForUser(userId);
}

export function buildTokenPairFromPayload(payload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload)
  };
}