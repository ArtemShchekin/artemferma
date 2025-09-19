import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction } from '../db/pool.js';
import config from '../config/index.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { hasMatured } from '../utils/garden.js';
import { ensurePlotsInitialized } from '../services/user-setup.js';


const router = Router();

router.get(
  '/plots',
  asyncHandler(async (req, res) => {
    const plots = await ensurePlotsInitialized(req.user.id);

    const mapped = plots.map((plot) => ({
      slot: plot.slot,
      type: plot.harvested ? null : plot.type,
      plantedAt: plot.planted_at,
      matured: hasMatured(plot.planted_at) && !plot.harvested,
      harvested: Boolean(plot.harvested)
    }));

    res.json(mapped);
  })
);

router.get(
  '/config',
  asyncHandler(async (_req, res) => {
    res.json({ growthMinutes: config.garden.growthMinutes });
  })
);

router.post(
  '/plant',
  asyncHandler(async (req, res) => {
    const { slot, inventoryId } = req.body || {};
    if (slot === undefined || slot === null || inventoryId === undefined || inventoryId === null || inventoryId === '') {
      throw new RequiredFieldError();
    }

    const slotNumber = Number(slot);
    const inventoryNumber = Number(inventoryId);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      throw new ValidationError();
    }
    if (!Number.isInteger(inventoryNumber) || inventoryNumber <= 0) {
      throw new ValidationError();
    }

    await withTransaction(async (connection) => {
      const [[plot]] = await connection.query(
        'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
        [req.user.id, slotNumber]
      );
      if (!plot || (plot.type && !plot.harvested)) {
        throw new ValidationError();
      }

      const [[seed]] = await connection.query(
        'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
        [inventoryNumber, req.user.id]
      );
      if (!seed || seed.kind !== 'seed') {
        throw new ValidationError();
      }

      await connection.query('DELETE FROM inventory WHERE id = ?', [inventoryNumber]);
      await connection.query(
        'UPDATE plots SET type = ?, planted_at = NOW(), harvested = 0 WHERE user_id = ? AND slot = ?',
        [seed.type, req.user.id, slotNumber]
      );
    });

    res.json({ ok: true });
  })
);

router.post(
  '/harvest',
  asyncHandler(async (req, res) => {
    const { slot } = req.body || {};
    if (slot === undefined || slot === null || slot === '') {
      throw new RequiredFieldError();
    }

    const slotNumber = Number(slot);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      throw new ValidationError();
    }

    await withTransaction(async (connection) => {
      const [[plot]] = await connection.query(
        'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
        [req.user.id, slotNumber]
      );
      if (!plot || !plot.type || plot.harvested) {
        throw new ValidationError();
      }
      if (!hasMatured(plot.planted_at)) {
        throw new ValidationError();
      }

      await connection.query(
        'UPDATE plots SET harvested = 1, type = NULL, planted_at = NULL WHERE user_id = ? AND slot = ?',
        [req.user.id, slotNumber]
      );
      await connection.query(
        'INSERT INTO inventory (user_id, kind, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, 'veg_raw', plot.type, 'harvested']
      );
    });

    res.json({ ok: true });
  })
);

export default router;