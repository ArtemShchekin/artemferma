import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDatabaseConnection, getPool, closePool } from './db/pool.js';
import { logError, logInfo } from './logging/index.js';

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let previousChar = '';

  for (const char of sql) {
    current += char;

    if (char === "'" && !inDoubleQuote && !inBacktick) {
      const isEscaped = previousChar === "'";
      if (!isEscaped) inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      const isEscaped = previousChar === '"';
      if (!isEscaped) inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement.length > 0) statements.push(statement);
      current = '';
    }

    previousChar = char;
  }

  const trailing = current.trim();
  if (trailing.length > 0) statements.push(trailing);
  return statements;
}

// --- НОВОЕ: классификация "безопасных" ошибок миграций ---
function isIgnorableMigrationError(err, statement) {
  const msg = (err?.message || '').toLowerCase();

  // MySQL codes (для reference): 1060 dup field, 1061 dup key, 1091 can't drop
  const code = err?.errno || err?.code;

  // Дубликат колонки/индекса — миграция уже применена
  if (
    /duplicate column name/i.test(err?.message) ||
    /already exists/i.test(err?.message) ||
    code === 1060 || // ER_DUP_FIELDNAME
    code === 1061    // ER_DUP_KEYNAME
  ) return true;

  // DROP несуществующего объекта — тоже ок
  if (
    /check that column\/key exists/i.test(err?.message) ||
    code === 1091 // ER_CANT_DROP_FIELD_OR_KEY
  ) return true;

  // На всякий — если явный идемпотентный SQL, но сервер старой версии (не знает IF NOT EXISTS)
  if (/add\s+column\s+if\s+not\s+exists/i.test(statement)) return true;
  if (/create\s+table\s+if\s+not\s+exists/i.test(statement)) return true;

  return false;
}

async function ensureMigrationsRegistry(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function loadAppliedMigrations(pool) {
  const [rows] = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map(row => row.filename));
}

async function markMigrationApplied(pool, file) {
  await pool.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
}

async function runMigrations() {
  await ensureDatabaseConnection();
  const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const pool = getPool();
  await ensureMigrationsRegistry(pool);
  const appliedMigrations = await loadAppliedMigrations(pool);
  let appliedCount = 0;

  for (const file of files) {
    if (appliedMigrations.has(file)) {
      logInfo('Migration file skipped (already applied)', {
        event: 'db.migration_file_skip',
        file
      });
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        await pool.query(trimmed);
        logInfo('Migration statement OK', { event: 'db.migration_stmt_ok', file, sql: trimmed.slice(0, 140) });
      } catch (err) {
        if (isIgnorableMigrationError(err, trimmed)) {
          logInfo('Migration statement skipped (idempotent)', {
            event: 'db.migration_stmt_skip',
            file,
            reason: err.message,
            sql: trimmed.slice(0, 140)
          });
          continue; // двигаемся дальше, не падаем
        }
        // Любая другая ошибка — валим, как и раньше
        throw err;
      }
    }

    await markMigrationApplied(pool, file);
    appliedMigrations.add(file);
    appliedCount += 1;
    logInfo('Migration file recorded', {
      event: 'db.migration_file_recorded',
      file
    });
  }

  logInfo('Migrations applied', { event: 'db.migrations_applied', count: appliedCount });
}

runMigrations()
  .then(() => {
    logInfo('Migration script finished', { event: 'db.migrations_done' });
    return closePool();
  })
  .then(() => process.exit(0))
  .catch(async (error) => {
    logError('Migration script failed', {
      event: 'db.migrations_failed',
      error: error.message,
      stack: error.stack
    });
    await closePool();
    process.exit(1);
  });
