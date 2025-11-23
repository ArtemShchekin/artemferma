import { withTransaction } from '../db/pool.js';
import { ConflictError, ValidationError } from '../utils/errors.js';

function normalizeInteger(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError();
  }
  return parsed;
}

export async function plantSeed({ userId, slot, inventoryId }) {
  const slotNumber = normalizeInteger(slot);
  const inventoryNumber = normalizeInteger(inventoryId);

  let plantedType = null;

  await withTransaction(async (connection) => {
    const [[plot]] = await connection.query(
      'SELECT * FROM plots WHERE user_id = ? AND slot = ? FOR UPDATE',
      [userId, slotNumber]
    );
    if (!plot) {
      throw new ValidationError();
    }

    if (plot.type && !plot.harvested) {
      throw new ConflictError('Грядка уже занята');
    }

    const [[seed]] = await connection.query(
      'SELECT * FROM inventory WHERE id = ? AND user_id = ? FOR UPDATE',
      [inventoryNumber, userId]
    );
    if (!seed || seed.kind !== 'seed') {
      throw new ValidationError();
    }

    await connection.query('DELETE FROM inventory WHERE id = ?', [inventoryNumber]);
    await connection.query(
      'UPDATE plots SET type = ?, planted_at = NOW(), harvested = 0 WHERE user_id = ? AND slot = ?',
      [seed.type, userId, slotNumber]
    );

    plantedType = seed.type;
  });

  return { slot: slotNumber, inventoryId: inventoryNumber, plantedType };
}
