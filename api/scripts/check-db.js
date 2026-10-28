import { pool } from '../src/shared/db/pool.js';

const { rows } = await pool.query('SELECT now() AS agora, version() AS versao');
console.log(JSON.stringify(rows[0], null, 2));
await pool.end();