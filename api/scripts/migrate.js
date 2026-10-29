import { fileURLToPath } from 'node:url';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pool } from '../src/shared/db/pool.js';
import { logger } from '../src/shared/logging/logger.js';

const dir = fileURLToPath(new URL('../migrations', import.meta.url));

await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);

const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
const { rows } = await pool.query('SELECT name FROM _migrations');
const applied = new Set(rows.map((r) => r.name));

let failed = false;
for (const file of files) {
  if (applied.has(file)) continue;
  const sql = await readFile(join(dir, file), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    await client.query('COMMIT');
    logger.info(`migração aplicada: ${file}`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ message: err.message, file }, 'migração falhou');
    failed = true;
  } finally {
    client.release();
  }
}

await pool.end();
if (failed) process.exit(1);