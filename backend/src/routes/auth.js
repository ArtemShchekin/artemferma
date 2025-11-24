import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/async-handler.js';
import { assertValid } from '../utils/validation.js';
import { RequiredFieldError, UnauthorizedError, ValidationError } from '../utils/errors.js';
import { queryOne, withTransaction } from '../db/pool.js';
import { verifyRefreshToken } from '../utils/jwt.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { ensureProfileWithConnection } from '../services/user-setup.js';
import {
  buildTokenPairFromPayload,
  getTokenPayloadForUser,
  rotateTokenVersion
} from '../services/token-version.js';

const router = Router();

const emailValidator = body('email').isEmail().withMessage('Ошибка валидации');
const passwordValidator = body('password')
  .isLength({ min: 6, max: 20 }).withMessage('Ошибка валидации')
  .matches(/^(?=.*\d)[A-Za-z\d]{6,20}$/).withMessage('Ошибка валидации');

router.post(
  '/register',
  [emailValidator, passwordValidator],
  asyncHandler(async (req, res) => {
    assertValid(req);
    const { email = '', password = '' } = req.body || {};

    if (email === '' || password === '') {
      throw new RequiredFieldError();
    }

    logApiRequest('User registered', {
      event: 'auth.register',
      method: 'POST',
      path: '/api/auth/register',
      email
    });

    const { userId } = await withTransaction(async (connection) => {
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ? FOR UPDATE', [email]);
      if (existing.length) {
        throw new ValidationError();
      }

      const hash = await bcrypt.hash(password, 10);
      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
        [email, hash, 'user']
      );

      const userId = result.insertId;

      await ensureProfileWithConnection(connection, userId);

      return { userId };
    });
    const payload = await rotateTokenVersion(userId);
    const tokens = buildTokenPairFromPayload(payload);    
    const response = {
      ...tokens,
      message: 'Регистрация произошла успешно'
    };
    res.json(response);

    logApiResponse('User registered', {
      event: 'auth.register',
      method: 'POST',
      path: '/api/auth/register',
      status: res.statusCode,
      userId,
      email,
      response
    });
  })
);

router.post(
  '/login',
  [emailValidator, body('password').isString().withMessage('Ошибка валидации')],
  asyncHandler(async (req, res) => {
    assertValid(req);
    const { email = '', password = '' } = req.body || {};

    if (email === '' || password === '') {
      throw new RequiredFieldError();
    }

    logApiRequest('User logged in', {
      event: 'auth.login',
      method: 'POST',
      path: '/api/auth/login',
      email
    });

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new ValidationError();
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new ValidationError();
    }

    const payload = await rotateTokenVersion(user.id);
    const tokens = buildTokenPairFromPayload(payload);    
    const response = { ...tokens };
    res.json(response);
    logApiResponse('User logged in', {
      event: 'auth.login',
      method: 'POST',
      path: '/api/auth/login',
      status: res.statusCode,
      userId: user.id,
      email,
      response
    });
  })
);

router.post(
  '/refresh',
  [body('refreshToken').isString().withMessage('Ошибка валидации')],
  asyncHandler(async (req, res) => {
    assertValid(req);
    const { refreshToken } = req.body || {};

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedError();
    }

    logApiRequest('Token refreshed', {
      event: 'auth.refresh',
      method: 'POST',
      path: '/api/auth/refresh',
      userId: payload.id
    });

    const user = await getTokenPayloadForUser(payload.id);
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError();
    }

    const rotatedPayload = await rotateTokenVersion(user.id);
    const tokens = buildTokenPairFromPayload(rotatedPayload);    
    const response = { ...tokens };
    res.json(response);

    logApiResponse('Token refreshed', {
      event: 'auth.refresh',
      method: 'POST',
      path: '/api/auth/refresh',
      status: res.statusCode,
      userId: user.id,
      response
    });
  })
);

export default router;