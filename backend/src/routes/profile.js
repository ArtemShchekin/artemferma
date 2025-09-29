import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool } from '../db/pool.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { ensureProfileInitialized } from '../services/user-setup.js';
import { logApi } from '../logging/index.js';
import config from '../config/index.js';

const DEFAULT_PROFILE = {
  is_cool: 0,
  first_name: null,
  last_name: null,
  middle_name: null,
  nickname: null,
  passport: null,
  balance: 30,
  sold_count: 0
};

const PRICE_PAYLOAD = {
  purchase: {
    basePrice: config.prices.purchaseBase,
    advPrice: config.prices.purchaseAdv
  },
  sale: {
    basePrice: config.prices.saleBase,
    advPrice: config.prices.saleAdv
  }
};

const toInt = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mapProfileRow(profileRow) {
  const source = profileRow ?? DEFAULT_PROFILE;
  const soldCount = toInt(source.sold_count, DEFAULT_PROFILE.sold_count);
  const balance = toInt(source.balance, DEFAULT_PROFILE.balance);

  return {
    isCoolFarmer: Boolean(source.is_cool),
    firstName: source.first_name ?? null,
    lastName: source.last_name ?? null,
    middleName: source.middle_name ?? null,
    nickname: source.nickname ?? null,
    passport: source.passport ?? null,
    soldCount,
    balance,
    level: soldCount >= 50 ? 2 : 1,
    prices: {
      purchase: { ...PRICE_PAYLOAD.purchase },
      sale: { ...PRICE_PAYLOAD.sale }
    }
  };
}

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const profile = await ensureProfileInitialized(req.user.id);
    const response = mapProfileRow(profile);

    res.json(response);
    logApi('Profile requested', {
      event: 'profile.get',
      method: 'GET',
      path: '/api/profile',
      userId: req.user.id,
      isCoolFarmer: response.isCoolFarmer,
      level: response.level,
      response
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
    await ensureProfileInitialized(req.user.id);
    const pool = getPool();
    const requestPayload = {
      isCoolFarmer: Boolean(isCoolFarmer),
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      middleName: middleName ?? null,
      nickname: nickname ?? null,
      passport: passport ?? null
    };

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

    const [[updatedProfile]] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [req.user.id]);
    const response = mapProfileRow(updatedProfile);    res.json(response);
    logApi('Profile updated', {
      event: 'profile.update',
      method: 'PUT',
      path: '/api/profile',
      userId: req.user.id,
      isCoolFarmer,
      mode: isCoolFarmer ? 'cool' : 'regular',
      request: requestPayload,
      response
    });
  })
);

export default router;