import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { logError } from '../logging/index.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database,
      waitForConnections: true,
      connectionLimit: config.database.connectionLimit,
      namedPlaceholders: false
    });
  }
  return pool;
}

export async function ensureDatabaseConnection() {
  const instance = getPool();
  await instance.query('SELECT 1');
}

export async function withTransaction(handler) {
  const instance = getPool();
  const connection = await instance.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      logError('Failed to rollback transaction', {
        event: 'db.rollback_error',
        error: rollbackError.message,
        stack: rollbackError.stack
      });
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}