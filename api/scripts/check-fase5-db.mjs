// Verifica Fase 5 no banco: colunas 013 + CHECK dos estados novos 014.
// Usa transação + SAVEPOINT + ROLLBACK: testa o CHECK sem alterar dados reais.
import { pool } from '../src/shared/db/pool.js';

const NOVOS_ESTADOS = [
  'AGUARDANDO_ATRIBUICAO_REPARACAO',
  'AGUARDANDO_REPARACAO',
  'AGUARDANDO_VALIDACAO_FUNCIONARIO',
];

const COBAIA = '(SELECT id FROM ordens_servico ORDER BY id DESC LIMIT 1)';

async function main() {
  console.log('=== 013 — colunas pendente_remocao (SELECT fora de transação) ===');
  for (const t of ['servicos_os', 'pecas_os']) {
    try {
      await pool.query(`SELECT pendente_remocao FROM ${t} LIMIT 0`);
      console.log(`OK   ${t}.pendente_remocao existe`);
    } catch (e) {
      console.log(`FALTA ${t}.pendente_remocao -> ${e.message}`);
    }
  }

  console.log('');
  console.log('=== 014 — CHECK/enum aceita estados novos (transação + rollback) ===');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const est of NOVOS_ESTADOS) {
      await client.query('SAVEPOINT sp_estado');
      try {
        await client.query(
          `UPDATE ordens_servico SET estado = $1 WHERE id = ${COBAIA}`,
          [est],
        );
        console.log(`OK   CHECK aceita ${est}`);
      } catch (e) {
        console.log(`REJEITA ${est} -> ${e.message}`);
      }
      // desfaz este UPDATE específico, mantém a transação viva para o próximo
      await client.query('ROLLBACK TO SAVEPOINT sp_estado');
    }
  } finally {
    // desfaz tudo; o banco fica exactamente como estava
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
  }

  console.log('');
  console.log('Conclusão:');
  console.log('- Se todas as linhas 013 disserem OK → migração 013 aplicada.');
  console.log('- Se todas as linhas 014 disserem OK → migração 014 aplicada.');
  console.log('- Qualquer FALTA/REJEITA → aplica o Passo B (migrações) e repete.');
}

main().catch((e) => {
  console.error('ERRO FATAL:', e.message);
  process.exit(1);
}); 