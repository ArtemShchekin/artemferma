import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool, withTransaction } from '../db/pool.js';
import { NotFoundError, RequiredFieldError, ValidationError } from '../utils/errors.js';
import { ensureProfileInitialized, ensureProfileWithConnection } from '../services/user-setup.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { buildPricePayload } from '../utils/pricing.js';
import { redactProfilePayload } from '../utils/redact.js';

const DEFAULT_PROFILE = {
  is_cool: 0,
  first_name: null,
  last_name: null,
  middle_name: null,
  nickname: null,
  passport: null,
  balance: 30,
  sold_count: 0,
  level: 1,
  yogurt_ml: 0,
  sunflower_oil_ml: 0,
  salads_eaten: 0
};

const toInt = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function mapProfileRow(profileRow, fallbackUserId = null) {
  const source = profileRow ?? DEFAULT_PROFILE;
  const normalizedFallback = fallbackUserId !== undefined && fallbackUserId !== null ? Number(fallbackUserId) : null;
  const userId =
    source.user_id !== undefined && source.user_id !== null ? Number(source.user_id) : normalizedFallback;
  const soldCount = toInt(source.sold_count, DEFAULT_PROFILE.sold_count);
  const balance = toInt(source.balance, DEFAULT_PROFILE.balance);
  const level = toInt(source.level, DEFAULT_PROFILE.level);
  const yogurtMl = toInt(source.yogurt_ml, 0);
  const sunflowerOilMl = toInt(source.sunflower_oil_ml, 0);
  const saladsEaten = toInt(source.salads_eaten, 0);
  const prices = buildPricePayload();

  return {
    id: userId,
    isCoolFarmer: Boolean(source.is_cool),
    firstName: source.first_name ?? null,
    lastName: source.last_name ?? null,
    middleName: source.middle_name ?? null,
    nickname: source.nickname ?? null,
    passport: source.passport ?? null,
    soldCount,
    balance,
    level,
    yogurtMl,
    sunflowerOilMl,
    saladsEaten,
    isFatFarmer: saladsEaten >= 3,
    prices
  };
}

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    logApiRequest('Profile requested', {
      event: 'profile.get',
      method: 'GET',
      path: '/api/profile',
      userId: req.user.id
    });

    const profile = await ensureProfileInitialized(req.user.id);
    const response = {
      ...mapProfileRow(profile, req.user.id),
      isAdmin: req.user.role === 'admin'
    };

    res.json(response);
    logApiResponse('Profile requested', {
      event: 'profile.get',
      method: 'GET',
      path: '/api/profile',
      userId: req.user.id,
      isCoolFarmer: response.isCoolFarmer,
      level: response.level,
      isAdmin: response.isAdmin,
      response
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id: idParam } = req.params;
    logApiRequest('Profile requested by id', {
      event: 'profile.getById',
      method: 'GET',
      path: `/api/profile/${idParam ?? ''}`,
      userId: req.user.id,
      requestedUserId: idParam ?? null
    });
    const userId = Number(idParam);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new ValidationError();
    }

    let profile;

    await withTransaction(async (connection) => {
      const [[user]] = await connection.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
      if (!user) {
        throw new NotFoundError('Пользователь не найден');
      }

      profile = await ensureProfileWithConnection(connection, userId);
    });

    const response = mapProfileRow(profile, userId);
    res.json(response);
    logApiResponse('Profile requested by id', {
      event: 'profile.getById',
      method: 'GET',
      path: `/api/profile/${userId}`,
      userId: req.user.id,
      requestedUserId: userId,
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

    const redactedRequest = redactProfilePayload(requestPayload);
    logApiRequest('Profile updated', {
      event: 'profile.update',
      method: 'PUT',
      path: '/api/profile',
      userId: req.user.id,
      isCoolFarmer,
      mode: isCoolFarmer ? 'cool' : 'regular',
      request: redactedRequest
    });

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
    const response = mapProfileRow(updatedProfile, req.user.id);
    res.json(response);
    const redactedResponse = redactProfilePayload(response);
    logApiResponse('Profile updated', {
      event: 'profile.update',
      method: 'PUT',
      path: '/api/profile',
      userId: req.user.id,
      isCoolFarmer,
      mode: isCoolFarmer ? 'cool' : 'regular',
      request: redactedRequest,
      response: redactedResponse
    });
  })
);

export default router;