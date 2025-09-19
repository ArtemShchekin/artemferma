import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction } from '../db/pool.js';
import config from '../config/index.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { isAdvancedSeed, SEED_TYPES } from '../utils/seeds.js';
import { ensureProfileWithConnection } from '../services/user-setup.js';

const router = Router();

router.get(
  '/prices',
  asyncHandler(async (_req, res) => {
    res.json({
      purchase: { basePrice: config.prices.purchaseBase, advPrice: config.prices.purchaseAdv },
      sale: { basePrice: config.prices.saleBase, advPrice: config.prices.saleAdv }
    });
  })
);

router.post(
  '/buy',
  asyncHandler(async (req, res) => {
    const { type } = req.body || {};
    if (!type) {
      throw new RequiredFieldError();
    }
    if (!SEED_TYPES.includes(type)) {
      throw new ValidationError();
    }

    await withTransaction(async (connection) => {
      const profile = await ensureProfileWithConnection(connection, req.user.id);

      const level = profile.sold_count >= 50 ? 2 : 1;
      if (isAdvancedSeed(type) && level < 2) {
        throw new ValidationError();
      }

      const price = isAdvancedSeed(type) ? config.prices.purchaseAdv : config.prices.purchaseBase;
      if (profile.balance < price) {
        throw new ValidationError();
      }

      await connection.query('UPDATE profiles SET balance = balance - ? WHERE user_id = ?', [price, req.user.id]);
      await connection.query(
        'INSERT INTO inventory (user_id, kind, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, 'seed', type, 'new']
      );
    });

    res.json({ ok: true });
  })
);

router.post(
  '/sell',
  asyncHandler(async (req, res) => {
    const { inventoryId } = req.body || {};
    if (inventoryId === undefined || inventoryId === null || inventoryId === '') {
      throw new RequiredFieldError();
    }

    const id = Number(inventoryId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError();
    }

    await withTransaction(async (connection) => {
      const [[item]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.user.id]
      );
      if (!item || item.kind !== 'veg_washed') {
        throw new ValidationError();
      }
      await ensureProfileWithConnection(connection, req.user.id);
      const price = isAdvancedSeed(item.type) ? config.prices.saleAdv : config.prices.saleBase;

      await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
      await connection.query(
        'UPDATE profiles SET balance = balance + ?, sold_count = sold_count + 1 WHERE user_id = ?',
        [price, req.user.id]
      );
    });

    res.json({ ok: true });
  })
);

export default router;