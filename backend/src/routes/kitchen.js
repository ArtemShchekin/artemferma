import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { withTransaction } from '../db/pool.js';
import { ensureProfileWithConnection } from '../services/user-setup.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';
import { SEED_TYPES } from '../utils/seeds.js';

const router = Router();

const RECIPES = {
  fruit: {
    key: 'fruit',
    name: 'Фруктовый салат',
    veg: {
      mango: 3
    },
    liquids: {
      yogurtMl: 1000
    }
  },
  vegetable: {
    key: 'vegetable',
    name: 'Овощной салат',
    veg: {
      carrot: 3,
      cabbage: 3,
      radish: 2
    },
    liquids: {
      sunflowerOilMl: 100
    }
  }
};

const KNOWN_VEGETABLE_TYPES = [...new Set(SEED_TYPES)];

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildVegetableCounts(rows) {
  const counts = KNOWN_VEGETABLE_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

  for (const row of rows) {
    if (!row || !row.type) {
      continue;
    }
    if (counts[row.type] === undefined) {
      counts[row.type] = 0;
    }
    counts[row.type] += 1;
  }

  return counts;
}

function mapKitchenState(profile, vegRows) {
  const vegetables = buildVegetableCounts(vegRows);
  const saladsEaten = toInt(profile.salads_eaten, 0);
  const preparedSalads = toInt(profile.prepared_salads, 0);

  return {
    vegetables,
    yogurtMl: toInt(profile.yogurt_ml, 0),
    sunflowerOilMl: toInt(profile.sunflower_oil_ml, 0),
    saladsEaten,
    preparedSalads,
    isFatFarmer: saladsEaten >= 3
  };
}

async function loadKitchenStateWithConnection(connection, userId) {
  const profile = await ensureProfileWithConnection(connection, userId);
  const [rows] = await connection.query(
    'SELECT type FROM inventory WHERE user_id = ? AND kind = "veg_washed"',
    [userId]
  );

  return mapKitchenState(profile, rows);
}

async function loadKitchenState(userId) {
  return withTransaction((connection) => loadKitchenStateWithConnection(connection, userId));
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    logApiRequest('Kitchen state requested', {
      event: 'kitchen.get',
      method: 'GET',
      path: '/api/kitchen',
      userId: req.user.id
    });

    const state = await loadKitchenState(req.user.id);
    res.json(state);
    logApiResponse('Kitchen state requested', {
      event: 'kitchen.get',
      method: 'GET',
      path: '/api/kitchen',
      userId: req.user.id,
      response: state
    });
  })
);

async function validateIngredients(definition, provided) {
  const expected = {
    ...definition.veg,
    ...(definition.liquids.yogurtMl ? { yogurtMl: definition.liquids.yogurtMl } : {}),
    ...(definition.liquids.sunflowerOilMl
      ? { sunflowerOilMl: definition.liquids.sunflowerOilMl }
      : {})
  };

  if (!provided) {
    return;
  }

  for (const [key, required] of Object.entries(expected)) {
    const value = toInt(provided[key], null);
    if (value === null || value !== required) {
      throw new ValidationError('Неверное количество ингредиентов');
    }
  }
}

async function prepareSalad(connection, userId, definition) {
  const profile = await ensureProfileWithConnection(connection, userId);

  if (definition.liquids.yogurtMl && toInt(profile.yogurt_ml, 0) < definition.liquids.yogurtMl) {
    throw new ValidationError('Недостаточно йогурта');
  }
  if (
    definition.liquids.sunflowerOilMl &&
    toInt(profile.sunflower_oil_ml, 0) < definition.liquids.sunflowerOilMl
  ) {
    throw new ValidationError('Недостаточно подсолнечного масла');
  }

  const idsToRemove = [];

  for (const [type, amount] of Object.entries(definition.veg)) {
    if (!amount) {
      continue;
    }

    const [items] = await connection.query(
      'SELECT id FROM inventory WHERE user_id = ? AND kind = "veg_washed" AND type = ? ORDER BY id ASC LIMIT ? FOR UPDATE',
      [userId, type, amount]
    );

    if (items.length < amount) {
      throw new ValidationError('Недостаточно овощей для рецепта');
    }

    idsToRemove.push(...items.map((item) => item.id));
  }

  if (idsToRemove.length > 0) {
    const placeholders = idsToRemove.map(() => '?').join(', ');
    await connection.query(`DELETE FROM inventory WHERE id IN (${placeholders})`, idsToRemove);
  }

  const updates = [];
  const params = [];

  if (definition.liquids.yogurtMl) {
    updates.push('yogurt_ml = yogurt_ml - ?');
    params.push(definition.liquids.yogurtMl);
  }
  if (definition.liquids.sunflowerOilMl) {
    updates.push('sunflower_oil_ml = sunflower_oil_ml - ?');
    params.push(definition.liquids.sunflowerOilMl);
  }
  updates.push('prepared_salads = prepared_salads + 1');

  await connection.query(
    `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
    [...params, userId]
  );
}

router.post(
  '/salads',
  asyncHandler(async (req, res) => {
    const { recipe, ingredients } = req.body || {};
    logApiRequest('Salad prepared', {
      event: 'kitchen.prepareSalad',
      method: 'POST',
      path: '/api/kitchen/salads',
      userId: req.user.id,
      recipe: recipe ?? null,
      ingredients: ingredients ?? null
    });
    if (!recipe) {
      throw new RequiredFieldError();
    }

    const definition = RECIPES[recipe];
    if (!definition) {
      throw new ValidationError();
    }

    await validateIngredients(definition, ingredients);

    const state = await withTransaction(async (connection) => {
      await prepareSalad(connection, req.user.id, definition);
      return loadKitchenStateWithConnection(connection, req.user.id);
    });

    res.json(state);
    logApiResponse('Salad prepared', {
      event: 'kitchen.prepareSalad',
      method: 'POST',
      path: '/api/kitchen/salads',
      userId: req.user.id,
      recipe,
      response: state
    });
  })
);

router.post(
  '/salads/eat',
  asyncHandler(async (req, res) => {
    logApiRequest('Salad eaten', {
      event: 'kitchen.eatSalad',
      method: 'POST',
      path: '/api/kitchen/salads/eat',
      userId: req.user.id
    });

    const state = await withTransaction(async (connection) => {
      const profile = await ensureProfileWithConnection(connection, req.user.id);
      if (toInt(profile.prepared_salads, 0) <= 0) {
        throw new ValidationError('Нет готовых салатов');
      }

      await connection.query(
        'UPDATE profiles SET prepared_salads = prepared_salads - 1, salads_eaten = salads_eaten + 1 WHERE user_id = ?',
        [req.user.id]
      );

      return loadKitchenStateWithConnection(connection, req.user.id);
    });

    res.json(state);
    logApiResponse('Salad eaten', {
      event: 'kitchen.eatSalad',
      method: 'POST',
      path: '/api/kitchen/salads/eat',
      userId: req.user.id,
      response: state
    });
  })
);

export default router;