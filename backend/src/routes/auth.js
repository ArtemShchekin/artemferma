import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/async-handler.js';
import { assertValid } from '../utils/validation.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { queryOne, withTransaction } from '../db/pool.js';
import { signToken } from '../utils/jwt.js';
import { logApi } from '../logging/index.js';
import { ensureProfileWithConnection } from '../services/user-setup.js';

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

    const { userId, token } = await withTransaction(async (connection) => {
      const [existing] = await connection.query('SELECT id FROM users WHERE email = ? FOR UPDATE', [email]);
      if (existing.length) {
        throw new ValidationError();
      }

      const hash = await bcrypt.hash(password, 10);
      const [result] = await connection.query(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [email, hash]
      );

      const userId = result.insertId;

      await ensureProfileWithConnection(connection, userId);

      const token = signToken({ id: userId, email });
      return { userId, token };
    });
      const response = { token, message: 'Регистрация произошла успешно' };
    res.json(response);

    logApi('User registered', {
      event: 'auth.register',
      method: 'POST',
      path: '/api/auth/register',
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

    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      throw new ValidationError();
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new ValidationError();
    }

    const token = signToken(user);
    const response = { token };
    res.json(response);
    logApi('User logged in', {
      event: 'auth.login',
      method: 'POST',
      path: '/api/auth/login',
      userId: user.id,
      response
    });    
  })
);

export default router;