import { pool } from '../src/shared/db/pool.js';

async function query(label) {
  const t0 = Date.now();
  try {
    const r = await pool.query(`
      SELECT
        now() AS server_time,
        current_database() AS db,
        current_user AS usr,
        inet_server_addr() AS server_ip,
        inet_server_port() AS port
    `);
    console.log(`${label}: OK em ${Date.now() - t0} ms`, r.rows[0]);
  } catch (e) {
    console.error(`${label}: FALHOU`, e.code ?? '', e.message);
  }
}

async function main() {
  console.log('=== Teste 1: ligação imediata ===');
  await query('query-1');

  console.log('');
  console.log('=== Teste 2: 5 segundos depois ===');
  await new Promise((r) => setTimeout(r, 5000));
  await query('query-2');

  console.log('');
  console.log('=== Teste 3: 60 segundos depois (simula idle) ===');
  await new Promise((r) => setTimeout(r, 60000));
  await query('query-3');

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO FATAL:', e.message);
  process.exit(1);
});