import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool } from '../db/pool.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import config from '../config/index.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    let [[profile]] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);

    if (!profile) {
      await pool.query('INSERT INTO profiles (user_id) VALUES (?)', [req.user.id]);
      if (config.garden.slots > 0) {
        const slots = Array.from({ length: config.garden.slots }, (_, index) => index + 1);
        const placeholders = slots.map(() => '(?, ?)').join(', ');
        const params = slots.flatMap((slot) => [req.user.id, slot]);
        await pool.query(`INSERT INTO plots (user_id, slot) VALUES ${placeholders}`, params);
      }
      [[profile]] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    }

    const level = profile.sold_count >= 50 ? 2 : 1;

    res.json({
      isCoolFarmer: Boolean(profile.is_cool),
      firstName: profile.first_name,
      lastName: profile.last_name,
      middleName: profile.middle_name,
      nickname: profile.nickname,
      passport: profile.passport,
      level,
      soldCount: profile.sold_count,
      balance: profile.balance
    });
  })
);

router.put(
  '/',
  asyncHandler(async (req, res) => {
    const { isCoolFarmer, firstName, lastName, middleName, nickname, passport } = req.body || {};

    if (isCoolFarmer === undefined) {
      throw new RequiredFieldError();
    }

    const pool = getPool();

    if (isCoolFarmer) {
      if (!nickname) {
        throw new RequiredFieldError();
      }
      if (!/^[A-Za-z]{2,15}$/.test(nickname)) {
        throw new ValidationError();
      }
      if (!passport) {
        throw new RequiredFieldError();
      }
      if (!/^\d{6}$/.test(passport)) {
        throw new ValidationError();
      }

      await pool.query(
        `UPDATE profiles
         SET is_cool = 1,
             first_name = NULL,
             last_name = NULL,
             middle_name = NULL,
             nickname = ?,
             passport = ?
         WHERE user_id = ?`,
        [nickname, passport, req.user.id]
      );
    } else {
      const ru = /^[А-ЯЁа-яё\-\s]{2,40}$/;
      if (!firstName || !lastName || !middleName) {
        throw new RequiredFieldError();
      }
      if (!ru.test(firstName) || !ru.test(lastName) || !ru.test(middleName)) {
        throw new ValidationError();
      }

      await pool.query(
        `UPDATE profiles
         SET is_cool = 0,
             first_name = ?,
             last_name = ?,
             middle_name = ?,
             nickname = NULL,
             passport = NULL
         WHERE user_id = ?`,
        [firstName, lastName, middleName, req.user.id]
      );
    }

    res.json({ ok: true, message: 'Данные сохранены' });
  })
);

export default router;