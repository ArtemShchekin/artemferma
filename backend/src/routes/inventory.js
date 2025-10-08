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

    const seeds = rows.filter((row) => row.kind === 'seed');
    const vegRaw = rows.filter((row) => row.kind === 'veg_raw');
    const vegWashed = rows.filter((row) => row.kind === 'veg_washed');

    const response = { seeds, vegRaw, vegWashed };
    res.json(response);
    logApiResponse('Inventory requested', {
      event: 'inventory.list',
      method: 'GET',
      path: '/api/inventory',
      userId: req.user.id,
      seeds: seeds.length,
      vegRaw: vegRaw.length,
      vegWashed: vegWashed.length,
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

export default router;