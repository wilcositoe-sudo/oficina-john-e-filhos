import { pool } from '../src/shared/db/pool.js';

const { rows } = await pool.query(`
  SELECT id, nome, email, reset_token, reset_token_expires_at 
  FROM utilizadores 
  WHERE reset_token IS NOT NULL AND ativo = TRUE
`);

console.log('--- TOKENS DE RECUPERAÇÃO ATIVOS NA BD ---');
if (rows.length === 0) {
  console.log('Nenhum token encontrado. A migração 004 pode não ter sido aplicada ou os tokens expiraram/foram usados.');
} else {
  rows.forEach(r => {
    console.log(`Email: ${r.email}`);
    console.log(`Token: ${r.reset_token}`);
    console.log(`Expira em: ${r.reset_token_expires_at}`);
    console.log('----------------------------------------');
  });
}

await pool.end();