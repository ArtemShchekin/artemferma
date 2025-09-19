import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';

let pool;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const attempts = Math.max(config.database.connectRetryAttempts, 1);
  const delayMs = Math.max(config.database.connectRetryDelayMs, 0);

  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await instance.query('SELECT 1');
      logInfo('Database connection established', {
        event: 'db.connection_established',
        attempt
      });
      return;
    } catch (error) {
      lastError = error;
      logError('Database connection attempt failed', {
        event: 'db.connection_retry',
        attempt,
        error: error.message,
        stack: error.stack
      });

      if (attempt < attempts && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;}

export async function withTransaction(handler, options = {}) {
  const instance = getPool();
  const connection = await instance.getConnection();

  try {
     if (options.isolationLevel) {
      await connection.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
    }
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

export async function query(sql, params = []) {
  const instance = getPool();
  return instance.query(sql, params);
}

export async function queryOne(sql, params = []) {
  const [rows] = await query(sql, params);
  return rows[0] ?? null;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}