import { Router } from 'express';
import { randomUUID } from 'crypto';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction, getPool } from '../db/pool.js';
import config from '../config/index.js';
import { ConflictError, RequiredFieldError, ValidationError, ServiceUnavailableError, UnprocessableEntityError, NotFoundError } from '../utils/errors.js';
import { hasMatured } from '../utils/garden.js';
import { ensurePlotsInitialized } from '../services/user-setup.js';
import { logApiRequest, logApiResponse, logInfo } from '../logging/index.js';
import { requireAdmin } from '../middleware/authorize.js';
import { getProducer, kafkaAvailable } from '../utils/message-broker.js';

const router = Router();

// Хранилище статусов посадки в памяти (для production лучше использовать Redis)
const plantRequests = new Map();

// Вспомогательная функция для подсчёта овощей
async function getVegCount(connection, userId) {
  const [[result]] = await connection.query(
    "SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND kind IN ('veg_raw', 'veg_washed') AND is_rotten = 0",
    [userId]
  );
  return Number(result.count);
}

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
      status: res.statusCode,
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
      IntegrationName: 'Clients',
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

    if (!kafkaAvailable()) {
      throw new ServiceUnavailableError('Очередь посадки недоступна');
    }

    const producer = await getProducer();
    if (!producer) {
      throw new ServiceUnavailableError('Очередь посадки недоступна');
    }

    const requestId = randomUUID();
    
    // Проверяем лимит инвентаря перед посадкой
    const vegCount = await getVegCountForPlanting(req.user.id, slotNumber);
    if (vegCount >= 20) {
      throw new UnprocessableEntityError('Инвентарь полон! Максимум 20 овощей. Продайте или выбросьте лишние.');
    }
    
    const messagePayload = {
      requestId,
      userId: req.user.id,
      slot: slotNumber,
      inventoryId: inventoryNumber,
      createdAt: new Date().toISOString()
    };

    // Сохраняем статус запроса
    plantRequests.set(requestId, {
      status: 'pending',
      ...messagePayload,
      updatedAt: new Date().toISOString()
    });

    await producer.send({
      topic: config.kafka.plantTopic,
      messages: [
        {
          key: requestId,
          value: JSON.stringify(messagePayload)
        }
      ]
    });

    logInfo('Задача посадки отправлена в Kafka', {
      event: 'garden.plant.produced',
      topic: config.kafka.plantTopic,
      requestId,
      userId: req.user.id,
      slot: slotNumber,
      inventoryId: inventoryNumber
    });

    const response = { accepted: true, requestId };
    res.status(202).json(response);
    logApiResponse('Garden seed planted', {
      event: 'garden.plant',
      method: 'POST',
      path: '/api/garden/plant',
      status: res.statusCode,
      IntegrationName: 'Clients',
      userId: req.user.id,
      slot: slotNumber,
      inventoryId: inventoryNumber,
      requestId,
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

      // Проверяем лимит инвентаря перед добавлением овоща
      const vegCount = await getVegCount(connection, req.user.id);
      if (vegCount >= 20) {
        throw new UnprocessableEntityError('Инвентарь полон! Максимум 20 овощей. Продайте или выбросьте лишние.');
      }

      await connection.query(
        `UPDATE plots
         SET harvested = 1, type = NULL, planted_at = NULL, matured_notified = 0
         WHERE user_id = ? AND slot = ?`,
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
      status: res.statusCode,
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
        `UPDATE plots
         SET harvested = 0, type = NULL, planted_at = NULL, matured_notified = 0
         WHERE user_id = ? AND slot = ?`,
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
      status: res.statusCode,
      userId: req.user.id,
      slot: slotNumber,
      uprootedType,
      response
    });
  })
);

// Endpoint для проверки статуса посадки
router.get(
  '/plant-status/:requestId',
  asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    logApiRequest('Plant status requested', {
      event: 'garden.plant.status',
      method: 'GET',
      path: `/api/garden/plant-status/${requestId ?? ''}`,
      userId: req.user.id,
      requestId
    });

    const requestStatus = plantRequests.get(requestId);

    if (!requestStatus) {
      throw new NotFoundError('Запрос на посадку не найден');
    }

    // Проверяем что пользователь имеет доступ к этому запросу
    if (requestStatus.userId !== req.user.id) {
      throw new NotFoundError('Запрос на посадку не найден');
    }

    // Очищаем старые записи (старше 1 часа)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [key, value] of plantRequests.entries()) {
      if (new Date(value.updatedAt).getTime() < oneHourAgo) {
        plantRequests.delete(key);
      }
    }

    const response = {
      requestId,
      status: requestStatus.status,
      slot: requestStatus.slot,
      createdAt: requestStatus.createdAt,
      updatedAt: requestStatus.updatedAt
    };

    res.json(response);
    logApiResponse('Plant status requested', {
      event: 'garden.plant.status',
      method: 'GET',
      path: `/api/garden/plant-status/${requestId}`,
      status: res.statusCode,
      userId: req.user.id,
      requestId,
      response
    });
  })
);

// Вспомогательная функция для подсчёта овощей
async function getVegCountForPlanting(userId, slotNumber) {
  const pool = getPool();
  const [[result]] = await pool.query(
    "SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND kind IN ('veg_raw', 'veg_washed') AND is_rotten = 0",
    [userId]
  );
  return result.count;
}

export default router;
