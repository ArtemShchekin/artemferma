import { Router } from 'express';
import { asyncHandler } from '../utils/async-handler.js';
import { getPool, withTransaction } from '../db/pool.js';
import { ensureProfileInitialized, ensureProfileWithConnection } from '../services/user-setup.js';
import { logApiRequest, logApiResponse } from '../logging/index.js';
import { RequiredFieldError, ValidationError } from '../utils/errors.js';

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

const TRACKED_TYPES = ['mango', 'carrot', 'cabbage', 'radish'];

function toInt(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function loadKitchenState(userId) {
  const profile = await ensureProfileInitialized(userId);
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT type FROM inventory WHERE user_id = ? AND kind = "veg_washed"',
    [userId]
  );

  const vegetables = TRACKED_TYPES.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

  for (const row of rows) {
    if (vegetables[row.type] !== undefined) {
      vegetables[row.type] += 1;
    }
  }

  return {
    vegetables,
    yogurtMl: toInt(profile.yogurt_ml, 0),
    sunflowerOilMl: toInt(profile.sunflower_oil_ml, 0),
    saladsEaten: toInt(profile.salads_eaten, 0),
    isFatFarmer: toInt(profile.salads_eaten, 0) >= 3
  };
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

    const expected = {
      ...definition.veg,
      ...(definition.liquids.yogurtMl ? { yogurtMl: definition.liquids.yogurtMl } : {}),
      ...(definition.liquids.sunflowerOilMl
        ? { sunflowerOilMl: definition.liquids.sunflowerOilMl }
        : {})
    };

    if (ingredients) {
      for (const [key, required] of Object.entries(expected)) {
        const provided = toInt(ingredients[key], null);
        if (provided === null || provided !== required) {
          throw new ValidationError('Неверное количество ингредиентов');
        }
      }
    }

    let state;

    await withTransaction(async (connection) => {
      const profile = await ensureProfileWithConnection(connection, req.user.id);

      if (
        definition.liquids.yogurtMl &&
        toInt(profile.yogurt_ml, 0) < definition.liquids.yogurtMl
      ) {
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
          [req.user.id, type, amount]
        );

        if (items.length < amount) {
          throw new ValidationError('Недостаточно овощей для рецепта');
        }

        idsToRemove.push(...items.map((item) => item.id));
      }

      if (idsToRemove.length > 0) {
        const placeholders = idsToRemove.map(() => '?').join(', ');
        await connection.query(
          `DELETE FROM inventory WHERE id IN (${placeholders})`,
          idsToRemove
        );
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
      updates.push('salads_eaten = salads_eaten + 1');

      await connection.query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        [...params, req.user.id]
      );

      const [[freshProfile]] = await connection.query(
        'SELECT * FROM profiles WHERE user_id = ?',
        [req.user.id]
      );

      const [vegRows] = await connection.query(
        'SELECT type FROM inventory WHERE user_id = ? AND kind = "veg_washed"',
        [req.user.id]
      );

      const vegetables = TRACKED_TYPES.reduce((acc, type) => {
        acc[type] = 0;
        return acc;
      }, {});
      for (const row of vegRows) {
        if (vegetables[row.type] !== undefined) {
          vegetables[row.type] += 1;
        }
      }

      state = {
        vegetables,
        yogurtMl: toInt(freshProfile.yogurt_ml, 0),
        sunflowerOilMl: toInt(freshProfile.sunflower_oil_ml, 0),
        saladsEaten: toInt(freshProfile.salads_eaten, 0),
        isFatFarmer: toInt(freshProfile.salads_eaten, 0) >= 3
      };
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

export default router;