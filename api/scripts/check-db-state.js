import { pool } from '../src/shared/db/pool.js';

const { rows: migracoes } = await pool.query('SELECT name FROM _migrations ORDER BY name');
console.log('Migrações aplicadas:');
for (const m of migracoes) console.log(' -', m.name);

try {
  const { rows } = await pool.query('SELECT last_value FROM recibos_numero_seq');
  console.log('Sequência recibos_numero_seq OK:', rows[0].last_value);
} catch (e) {
  console.log('ERRO na sequência:', e.message);
}

await pool.end();