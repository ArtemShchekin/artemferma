import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/async-handler.js';
import { assertValid } from '../utils/validation.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { getPool, withTransaction } from '../db/pool.js';
import config from '../config/index.js';
import { signToken } from '../utils/jwt.js';
import { logInfo } from '../logging/index.js';

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

      await connection.query('INSERT INTO profiles (user_id) VALUES (?)', [userId]);

      const slots = Array.from({ length: config.garden.slots }, (_, index) => index + 1);
      if (slots.length > 0) {
        const placeholders = slots.map(() => '(?, ?)').join(', ');
        const params = slots.flatMap((slot) => [userId, slot]);
        await connection.query(`INSERT INTO plots (user_id, slot) VALUES ${placeholders}`, params);
      }

      const token = signToken({ id: userId, email });
      return { userId, token };
    });

    logInfo('User registered', { event: 'auth.register', userId, email });
    res.json({ token, message: 'Регистрация произошла успешно' });
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

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      throw new ValidationError();
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new ValidationError();
    }

    const token = signToken(user);
    logInfo('User logged in', { event: 'auth.login', userId: user.id });
    res.json({ token });
  })
);

export default router;