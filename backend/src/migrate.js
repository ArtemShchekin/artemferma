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
      if (!isEscaped) {
        inSingleQuote = !inSingleQuote;
      }
    } else if (char === '"' && !inSingleQuote && !inBacktick) {
      const isEscaped = previousChar === '"';
      if (!isEscaped) {
        inDoubleQuote = !inDoubleQuote;
      }
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement.length > 0) {
        statements.push(statement);
      }
      current = '';
    }

    previousChar = char;
  }

  const trailing = current.trim();
  if (trailing.length > 0) {
    statements.push(trailing);
  }

  return statements;
}

async function runMigrations() {
  await ensureDatabaseConnection();
  const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const pool = getPool();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      await pool.query(statement);
    }
  }

  logInfo('Migrations applied', { event: 'db.migrations_applied', count: files.length });

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