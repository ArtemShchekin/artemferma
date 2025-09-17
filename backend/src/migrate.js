
import { getPool } from './db.js';
import fs from 'fs';
import path from 'path';

async function run() {
  const pool = await getPool();
  const dir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf-8');
    const statements = sql.split(/;\s*\n/).map(s=>s.trim()).filter(Boolean);
    for (const st of statements) {
      await pool.query(st);
    }
  }
  console.log('Migrations applied.');
  process.exit(0);
}
run().catch(e=>{ console.error(e); process.exit(1); });
