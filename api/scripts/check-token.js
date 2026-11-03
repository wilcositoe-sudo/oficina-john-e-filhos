import { pool } from '../src/shared/db/pool.js';

// O token que apareceu no teu terminal (agora corretamente entre aspas)
const TOKEN_PARA_TESTAR = '4c7f4d0960f6047e58c3ca8cc6e8b4f93d8a73e734b0a2b163643141a0b4da93'; 

const { rows } = await pool.query(
  `SELECT id, nome, email, reset_token, reset_token_expires_at, ativo 
   FROM utilizadores WHERE reset_token = $1`,
  [TOKEN_PARA_TESTAR] // Usamos a constante aqui, garantindo que é tratada como texto
);

if (rows.length === 0) {
  console.log('❌ Token NÃO encontrado na base de dados.');
  console.log('Possíveis causas:');
  console.log('1. A migração 004 não foi aplicada (as colunas reset_token não existem).');
  console.log('2. O token que copiaste tem espaços a mais ou está incompleto.');
  console.log('3. O token expirou (validade de 1 hora) ou já foi usado.');
} else {
  console.log('✅ Token encontrado para o utilizador:', rows[0].email);
  console.log('Expira em:', rows[0].reset_token_expires_at);
  console.log('Conta ativa?', rows[0].ativo);
}

await pool.end();