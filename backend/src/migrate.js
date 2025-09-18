import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDatabaseConnection, getPool, closePool } from './db/pool.js';
import { logError, logInfo } from './logging/index.js';

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
    const statements = sql
      .split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter(Boolean);

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