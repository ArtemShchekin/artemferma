import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool, withTransaction } from '../db/pool.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';

const router = Router();

const ROTTEN_THRESHOLD_SQL = 'DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)';

async function markRottenVegetables(connection, userId, inventoryId = null) {
  let query =
    "UPDATE inventory SET is_rotten = 1, status = 'rotten' " +
    "WHERE user_id = ? AND kind = 'veg_raw' AND is_rotten = 0 " +
    'AND created_at <= ' + ROTTEN_THRESHOLD_SQL;
  const params = [userId];

  if (inventoryId !== null) {
    query += ' AND id = ?';
    params.push(inventoryId);
  }

  await connection.query(query, params);
}

function normalizeInventoryRow(row) {
  return {
    id: row.id,
    kind: row.kind,
    type: row.type,
    status: row.status,
    created_at: row.created_at,
    is_rotten: Boolean(row.is_rotten)
  };
}

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

    // Обновляем протухшие записи в БД по порогу (24 часа)
    await markRottenVegetables(pool, req.user.id);

    const [rows] = await pool.query(
      'SELECT id, kind, type, status, created_at, is_rotten FROM inventory WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    );

    const seeds = [];
    const vegRaw = [];
    const vegWashed = [];
    const vegRotten = [];

    for (const row of rows) {
      const item = normalizeInventoryRow(row);

      if (row.kind === 'seed') {
        seeds.push(item);
        continue;
      }

      if (row.kind === 'veg_washed') {
        vegWashed.push(item);
        continue;
      }

      if (row.kind === 'veg_raw') {
        if (item.is_rotten) {
          vegRotten.push({ ...item, status: 'rotten' });
        } else {
          vegRaw.push(item);
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
      // Сначала отметим возможное протухание этой конкретной записи
      await markRottenVegetables(connection, req.user.id, id);

      const [[item]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.user.id]
      );

      // Мы можем мыть только свежий сырой овощ
      if (!item || item.kind !== 'veg_raw' || item.is_rotten) {
        throw new ValidationError();
      }

      await connection.query(
        'UPDATE inventory SET kind = "veg_washed", status = "washed", is_rotten = 0 WHERE id = ?',
        [id]
      );
    });

    const response = { ok: true };
    res.json(response);

    logApiResponse('Inventory item washed', {
      event: 'inventory.wash',
      method: 'PATCH',
      path: `/api/inventory/wash/${paramId}`,
      userId: req.user.id,
      inventoryId: Number(paramId),
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

    await withTransaction(async (connection) => {
      // Обновим протухание для конкретной записи (если она успела протухнуть)
      await markRottenVegetables(connection, req.user.id, id);

      const [[item]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [id, req.user.id]
      );

      // Удалять разрешено только протухший сырой овощ
      if (!item || item.kind !== 'veg_raw' || !item.is_rotten) {
        throw new ValidationError();
      }

      await connection.query('DELETE FROM inventory WHERE id = ?', [id]);
    });

    const response = { ok: true };
    res.json(response);

    logApiResponse('Inventory item deleted', {
      event: 'inventory.delete',
      method: 'DELETE',
      path: `/api/inventory/${paramId}`,
      userId: req.user.id,
      inventoryId: Number(paramId),
      response
    });
  })
);

export default router;
