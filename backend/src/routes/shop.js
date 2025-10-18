import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction } from '../db/pool.js';
import config from '../config/index.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { isAdvancedSeed, SEED_TYPES } from '../utils/seeds.js';
import { ensureProfileWithConnection } from '../services/user-setup.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { buildPricePayload } from '../utils/pricing.js';

const router = Router();

router.get(
  '/prices',
  asyncHandler(async (req, res) => {
    logApiRequest('Shop prices requested', {
      event: 'shop.prices',
      method: 'GET',
      path: '/api/shop/prices',
      userId: req.user.id
    });

    const response = buildPricePayload();

    res.json(response);
    logApiResponse('Shop prices requested', {
      event: 'shop.prices',
      method: 'GET',
      path: '/api/shop/prices',
      userId: req.user.id,
      response
    });
  })
);

router.post(
  '/buy',
  asyncHandler(async (req, res) => {
    const { type } = req.body || {};
    logApiRequest('Seed purchased', {
      event: 'shop.buy',
      method: 'POST',
      path: '/api/shop/buy',
      userId: req.user.id,
      type: type ?? null
    });
    if (!type) {
      throw new RequiredFieldError();
    }
    if (!SEED_TYPES.includes(type)) {
      throw new ValidationError();
    }

    let price = 0;

    await withTransaction(async (connection) => {
      const profile = await ensureProfileWithConnection(connection, req.user.id);

      const level = Number.parseInt(profile.level, 10) || 1;
      if (isAdvancedSeed(type) && level < 2) {
        throw new ValidationError();
      }

      price = isAdvancedSeed(type) ? config.prices.purchaseAdv : config.prices.purchaseBase;
      if (profile.balance < price) {
        throw new ValidationError();
      }

      await connection.query('UPDATE profiles SET balance = balance - ? WHERE user_id = ?', [price, req.user.id]);
      await connection.query(
        'INSERT INTO inventory (user_id, kind, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, 'seed', type, 'new']
      );
    });

    const response = { ok: true };
    res.json(response);
    logApiResponse('Seed purchased', {
      event: 'shop.buy',
      method: 'POST',
      path: '/api/shop/buy',
      userId: req.user.id,
      type,
      price,
      response
    });
  })
);

router.post(
  '/buy-supply',
  asyncHandler(async (req, res) => {
    const { supply } = req.body || {};
    logApiRequest('Supply purchased', {
      event: 'shop.buySupply',
      method: 'POST',
      path: '/api/shop/buy-supply',
      userId: req.user.id,
      supply: supply ?? null
    });
    if (!supply) {
      throw new RequiredFieldError();
    }

    if (!['yogurt', 'sunflowerOil'].includes(supply)) {
      throw new ValidationError();
    }

    let price = 0;
    let volume = 0;

    await withTransaction(async (connection) => {
      const profile = await ensureProfileWithConnection(connection, req.user.id);

      if (supply === 'yogurt') {
        price = config.supplies.yogurt.price;
        volume = config.supplies.yogurt.volume;
      } else {
        price = config.supplies.sunflowerOil.price;
        volume = config.supplies.sunflowerOil.volume;
      }

      if (profile.balance < price) {
        throw new ValidationError();
      }

      const updates = ['balance = balance - ?'];
      const params = [price];

      if (supply === 'yogurt') {
        updates.push('yogurt_ml = yogurt_ml + ?');
      } else {
        updates.push('sunflower_oil_ml = sunflower_oil_ml + ?');
      }
      params.push(volume, req.user.id);

      await connection.query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    });

    const response = { ok: true, price, volume };
    res.json(response);
    logApiResponse('Supply purchased', {
      event: 'shop.buySupply',
      method: 'POST',
      path: '/api/shop/buy-supply',
      userId: req.user.id,
      supply,
      price,
      volume,
      response
    });
  })
);

router.post(
  '/sell',
  asyncHandler(async (req, res) => {
    const { inventoryId } = req.body || {};
    logApiRequest('Harvest sold', {
      event: 'shop.sell',
      method: 'POST',
      path: '/api/shop/sell',
      userId: req.user.id,
      inventoryId: inventoryId ?? null
    });
    if (inventoryId === undefined || inventoryId === null || inventoryId === '') {
      throw new RequiredFieldError();
    }

    const id = Number(inventoryId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError();
    }

    let price = 0;
    let soldType = null;

    await withTransaction(async (connection) => {
      const [[item]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.user.id]
      );
      if (!item || item.kind !== 'veg_washed') {
        throw new ValidationError();
      }
      await ensureProfileWithConnection(connection, req.user.id);
      soldType = item.type;
      price = isAdvancedSeed(item.type) ? config.prices.saleAdv : config.prices.saleBase;

      await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
      await connection.query(
        `UPDATE profiles
         SET balance = balance + ?,
             sold_count = sold_count + 1,
             level = CASE WHEN sold_count + 1 >= 50 THEN 2 ELSE 1 END
         WHERE user_id = ?`,
        [price, req.user.id]
      );
    });

    const response = { ok: true };
    res.json(response);
    logApiResponse('Harvest sold', {
      event: 'shop.sell',
      method: 'POST',
      path: '/api/shop/sell',
      userId: req.user.id,
      inventoryId: id,
      type: soldType,
      price,
      response
    });
  })
);

export default router;