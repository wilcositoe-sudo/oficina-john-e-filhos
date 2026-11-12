import { pool } from '../src/shared/db/pool.js';

async function main() {
  console.log('=== COLUNAS DA TABELA notificacoes ===');

  const cols = await pool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'notificacoes'
    ORDER BY ordinal_position
  `);

  console.table(cols.rows);

  const names = cols.rows.map((c) => c.column_name);

  console.log('');
  console.log('Lista simples de colunas:');
  console.log(names.join(', '));

  const candidatosData = [
    'created_at',
    'criado_at',
    'createdAt',
    'criadoEm',
    'data_criacao',
    'criacao',
    'created',
    'created_time',
    'criado',
  ];

  const colunaData = candidatosData.find((n) => names.includes(n));

  console.log('');
  if (colunaData) {
    console.log(`Coluna de data provável: ${colunaData}`);
  } else {
    console.log('Não encontrei coluna de data óbvia na tabela notificacoes.');
  }

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});