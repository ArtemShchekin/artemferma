import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool, withTransaction } from '../db/pool.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, kind, type, status, created_at FROM inventory WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );

    const seeds = rows.filter((row) => row.kind === 'seed');
    const vegRaw = rows.filter((row) => row.kind === 'veg_raw');
    const vegWashed = rows.filter((row) => row.kind === 'veg_washed');

    res.json({ seeds, vegRaw, vegWashed });
  })
);

router.post(
  '/wash',
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
      if (!item || item.kind !== 'veg_raw') {
        throw new ValidationError();
      }

      await connection.query(
        'UPDATE inventory SET kind = "veg_washed", status = "washed" WHERE id = ?',
        [id]
      );
    });

    res.json({ ok: true });
  })
);

export default router;