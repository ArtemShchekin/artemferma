import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction } from '../db/pool.js';
import config from '../config/index.js';
import { ConflictError, RequiredFieldError, ValidationError } from '../utils/errors.js';
import { hasMatured } from '../utils/garden.js';
import { ensurePlotsInitialized } from '../services/user-setup.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { requireAdmin } from '../middleware/authorize.js';


const router = Router();

router.get(
  '/plots',
  asyncHandler(async (req, res) => {
    logApiRequest('Garden plots requested', {
      event: 'garden.plots',
      method: 'GET',
      path: '/api/garden/plots',
      userId: req.user.id
    });

    const plots = await ensurePlotsInitialized(req.user.id);

    const mapped = plots.map((plot) => ({
      slot: plot.slot,
      type: plot.harvested ? null : plot.type,
      plantedAt: plot.planted_at,
      matured: hasMatured(plot.planted_at) && !plot.harvested,
      harvested: Boolean(plot.harvested)
    }));

    const response = {
      plots: mapped,
      growthMinutes: config.garden.growthMinutes,
      canUproot: req.user.role === 'admin'
    };
    res.json(response);
    logApiResponse('Garden plots requested', {
      event: 'garden.plots',
      method: 'GET',
      path: '/api/garden/plots',
      userId: req.user.id,
      slots: mapped.length,
      growthMinutes: config.garden.growthMinutes,
      canUproot: response.canUproot,
      response
    });
  })
);

router.post(
  '/plant',
  asyncHandler(async (req, res) => {
    const { slot, inventoryId } = req.body || {};
    logApiRequest('Garden seed planted', {
      event: 'garden.plant',
      method: 'POST',
      path: '/api/garden/plant',
      userId: req.user.id,
      slot: slot ?? null,
      inventoryId: inventoryId ?? null
    });
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

    let plantedType = null;

    await withTransaction(async (connection) => {
      const [[plot]] = await connection.query(
        'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
        [req.user.id, slotNumber]
      );
      if (!plot) {
        throw new ValidationError();
      }

      if (plot.type && !plot.harvested) {
        throw new ConflictError('Грядка уже занята');
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

      plantedType = seed.type;
    });

    const response = { ok: true };
    res.json(response);
    logApiResponse('Garden seed planted', {
      event: 'garden.plant',
      method: 'POST',
      path: '/api/garden/plant',
      userId: req.user.id,
      slot: slotNumber,
      seedType: plantedType,
      inventoryId: inventoryNumber,
      response
    });
  })
);

router.post(
  '/harvest',
  asyncHandler(async (req, res) => {
    const { slot } = req.body || {};
    logApiRequest('Garden harvest completed', {
      event: 'garden.harvest',
      method: 'POST',
      path: '/api/garden/harvest',
      userId: req.user.id,
      slot: slot ?? null
    });
    if (slot === undefined || slot === null || slot === '') {
      throw new RequiredFieldError();
    }

    const slotNumber = Number(slot);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      throw new ValidationError();
    }

    let harvestedType = null;

    await withTransaction(async (connection) => {
      const [[plot]] = await connection.query(
        'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
        [req.user.id, slotNumber]
      );
      if (!plot || !plot.type || plot.harvested || !hasMatured(plot.planted_at)) {
        throw new ConflictError('Овощ ещё совсем зелёный');
      }

      await connection.query(
        'UPDATE plots SET harvested = 1, type = NULL, planted_at = NULL WHERE user_id = ? AND slot = ?',
        [req.user.id, slotNumber]
      );
      await connection.query(
        'INSERT INTO inventory (user_id, kind, type, status) VALUES (?, ?, ?, ?)',
        [req.user.id, 'veg_raw', plot.type, 'harvested']
      );

      harvestedType = plot.type;
    });

    const response = { ok: true };
    res.json(response);
    logApiResponse('Garden harvest completed', {
      event: 'garden.harvest',
      method: 'POST',
      path: '/api/garden/harvest',
      userId: req.user.id,
      slot: slotNumber,
      cropType: harvestedType,
      response
    });
  })
);

router.delete(
  '/uproot/:slot',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { slot: slotParam } = req.params || {};

    logApiRequest('Garden plot uprooted', {
      event: 'garden.uproot',
      method: 'DELETE',
      path: `/api/garden/uproot/${slotParam ?? ''}`,
      userId: req.user.id,
      slot: slotParam ?? null
    });

    const slotNumber = Number(slotParam);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      throw new ValidationError();
    }

    let uprootedType = null;

    await withTransaction(async (connection) => {
      const [[plot]] = await connection.query(
        'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
        [req.user.id, slotNumber]
      );

      if (!plot || !plot.type || plot.harvested) {
        throw new ValidationError();
      }

      await connection.query(
        'UPDATE plots SET harvested = 0, type = NULL, planted_at = NULL WHERE user_id = ? AND slot = ?',
        [req.user.id, slotNumber]
      );

      uprootedType = plot.type;
    });

    const response = { ok: true };
    res.json(response);

    logApiResponse('Garden plot uprooted', {
      event: 'garden.uproot',
      method: 'DELETE',
      path: `/api/garden/uproot/${slotNumber}`,
      userId: req.user.id,
      slot: slotNumber,
      uprootedType,
      response
    });
  })
);

export default router;
