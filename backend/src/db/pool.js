import mysql from 'mysql2/promise';
import config from '../config/index.js';
import { logError, logInfo } from '../logging/index.js';
import { getRequestContext } from '../utils/request-context.js';

let pool;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const INSTRUMENTED_FLAG = Symbol('mysql.instrumented');

function detectOperation(sql) {
  if (typeof sql !== 'string') {
    return null;
  }

  const normalized = sql.trim();
  if (!normalized) {
    return null;
  }

  return normalized.split(/\s+/)[0]?.toUpperCase() ?? null;
}

function normalizeSql(sql) {
  if (typeof sql === 'string') {
    return sql.replace(/\s+/g, ' ').trim();
  }
  if (sql === undefined || sql === null) {
    return '';
  }
  return String(sql);
}

function sanitizeValue(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value.length > 1024 ? `${value.slice(0, 1021)}...` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, sanitizeValue(val)]));
  }
  return String(value);
}

function sanitizeParams(params) {
  if (params === undefined) {
    return undefined;
  }

  return sanitizeValue(params);
}

function computeRowCount(rows) {
  if (rows === undefined || rows === null) {
    return null;
  }

  if (Array.isArray(rows)) {
    return rows.length;
  }

  if (typeof rows === 'object') {
    if (typeof rows.affectedRows === 'number') {
      return rows.affectedRows;
    }
    if (typeof rows.changedRows === 'number') {
      return rows.changedRows;
    }
    if (typeof rows.warningStatus === 'number') {
      return rows.warningStatus;
    }
  }

  return null;
}

function buildLogPayload(sql, params) {
  const requestContext = getRequestContext();
  const operation = detectOperation(sql);
  const payload = {
    event: 'db.query',
    sql: normalizeSql(sql)
  };

  const sanitizedParams = sanitizeParams(params);
  if (sanitizedParams !== undefined) {
    payload.params = sanitizedParams;
  }

  if (operation) {
    payload.operation = operation;
  }

  if (requestContext) {
    payload.requestId = requestContext.requestId ?? null;
    payload.method = requestContext.method ?? null;
    payload.path = requestContext.path ?? null;
    payload.userId = requestContext.userId ?? null;
    if (requestContext.statusCode !== undefined) {
      payload.statusCode = requestContext.statusCode;
    }
  }

  return payload;
}

function instrumentQueryLike(target, methodName) {
  const original = target[methodName];
  if (typeof original !== 'function') {
    return;
  }

  target[methodName] = async function instrumented(sql, params = []) {
    const started = Date.now();
    const basePayload = buildLogPayload(sql, params);
    const requestPayload = {
      ...basePayload,
      stage: 'request'
    };

    logInfo('Database query request', requestPayload);

    try {
      const result = await original.call(this, sql, params);
      const durationMs = Date.now() - started;
      const [rows] = Array.isArray(result) ? result : [result];
      const rowCount = computeRowCount(rows);
      const successPayload = {
        ...basePayload,
        stage: 'response',
        durationMs
      };
      if (rowCount !== null) {
        successPayload.rowCount = rowCount;
      }
      logInfo('Database query response', successPayload);
      return result;
    } catch (error) {
      const errorPayload = {
        ...basePayload,
        stage: 'error',
        durationMs: Date.now() - started,
        error: error.message,
        stack: error.stack
      };
      logError('Database query error', errorPayload);
      throw error;
    }
  };
}

function instrumentConnection(connection) {
  if (connection[INSTRUMENTED_FLAG]) {
    return connection;
  }

  instrumentQueryLike(connection, 'query');
  instrumentQueryLike(connection, 'execute');
  connection[INSTRUMENTED_FLAG] = true;
  return connection;
}

function instrumentPool(instance) {
  if (instance[INSTRUMENTED_FLAG]) {
    return instance;
  }

  instrumentQueryLike(instance, 'query');
  instrumentQueryLike(instance, 'execute');

  const originalGetConnection = instance.getConnection.bind(instance);
  instance.getConnection = async function instrumentedGetConnection(...args) {
    const connection = await originalGetConnection(...args);
    return instrumentConnection(connection);
  };

  instance[INSTRUMENTED_FLAG] = true;
  return instance;
}

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
    instrumentPool(pool);
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

  throw lastError;
}

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