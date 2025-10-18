import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool, withTransaction } from '../db/pool.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';


const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    logApiRequest('Inventory requested', {
      event: 'inventory.list',
      method: 'GET',
      path: '/api/inventory',
      userId: req.user.id
    });

    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT id, kind, type, status, created_at FROM inventory WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );

    const now = Date.now();
    const ROTTEN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

    const seeds = [];
    const vegRaw = [];
    const vegWashed = [];
    const vegRotten = [];

    for (const row of rows) {
      if (row.kind === 'seed') {
        seeds.push(row);
        continue;
      }

      if (row.kind === 'veg_washed') {
        vegWashed.push(row);
        continue;
      }

      if (row.kind === 'veg_raw') {
        const createdAtMs = new Date(row.created_at).getTime();
        const isRotten = Number.isFinite(createdAtMs) && now - createdAtMs >= ROTTEN_THRESHOLD_MS;

        if (isRotten) {
          vegRotten.push({ ...row, status: 'rotten' });
        } else {
          vegRaw.push(row);
        }
      }
    }

    const response = { seeds, vegRaw, vegWashed, vegRotten };
    res.json(response);
    logApiResponse('Inventory requested', {
      event: 'inventory.list',
      method: 'GET',
      path: '/api/inventory',
      userId: req.user.id,
      seeds: seeds.length,
      vegRaw: vegRaw.length,
      vegWashed: vegWashed.length,
      vegRotten: vegRotten.length,
      response
    });
  })
);

router.patch(
  '/wash/:id',
  asyncHandler(async (req, res) => {
    const { id: paramId } = req.params;
    logApiRequest('Inventory item washed', {
      event: 'inventory.wash',
      method: 'PATCH',
      path: `/api/inventory/wash/${paramId ?? ''}`,
      userId: req.user.id,
      inventoryId: paramId ?? null
    });
    if (paramId === undefined || paramId === null || paramId === '') {
      throw new RequiredFieldError();
    }

    const id = Number(paramId);
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

    const response = { ok: true };
    res.json(response);
    logApiResponse('Inventory item washed', {
      event: 'inventory.wash',
      method: 'PATCH',
      path: `/api/inventory/wash/${id}`,
      userId: req.user.id,
      inventoryId: id,
      response
    });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id: paramId } = req.params;
    logApiRequest('Inventory item deleted', {
      event: 'inventory.delete',
      method: 'DELETE',
      path: `/api/inventory/${paramId ?? ''}`,
      userId: req.user.id,
      inventoryId: paramId ?? null
    });

    if (paramId === undefined || paramId === null || paramId === '') {
      throw new RequiredFieldError();
    }

    const id = Number(paramId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError();
    }

    const ROTTEN_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    await withTransaction(async (connection) => {
      const [[item]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.user.id]
      );
      if (!item || item.kind !== 'veg_raw') {
        throw new ValidationError();
      }

      const createdAtMs = new Date(item.created_at).getTime();
      const isRotten = Number.isFinite(createdAtMs) && now - createdAtMs >= ROTTEN_THRESHOLD_MS;

      if (!isRotten) {
        throw new ValidationError();
      }

      await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
    });

    const response = { ok: true };
    res.json(response);
    logApiResponse('Inventory item deleted', {
      event: 'inventory.delete',
      method: 'DELETE',
      path: `/api/inventory/${id}`,
      userId: req.user.id,
      inventoryId: id,
      response
    });
  })
);

export default router;
