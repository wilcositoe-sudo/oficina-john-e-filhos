// Pré-requisitos do browser Fase 5 que o smoke-f10 NÃO cobre:
// coluna origem (lancarServicoSemPreco/lancarPecaSemPreco/listarLinhas)
// e tabela diagnostico_checklist (guardarChecklist/listarChecklist).
import { pool } from '../src/shared/db/pool.js';

async function main() {
  console.log('=== coluna origem (risco: passo 3 mecânico) ===');
  for (const t of ['servicos_os', 'pecas_os']) {
    try {
      await pool.query(`SELECT origem FROM ${t} LIMIT 0`);
      console.log(`OK   ${t}.origem existe`);
    } catch (e) {
      console.log(`FALTA ${t}.origem -> ${e.message}`);
    }
  }

  console.log('');
  console.log('=== tabela diagnostico_checklist (risco: passo 3 mecânico) ===');
  try {
    await pool.query(
      `SELECT ordem_id, mecanico_id, item, estado, observacao, valor_medicao, foto_url FROM diagnostico_checklist LIMIT 0`,
    );
    console.log('OK   diagnostico_checklist existe com as colunas esperadas');
  } catch (e) {
    console.log(`FALTA/erro diagnostico_checklist -> ${e.message}`);
  }

  await pool.end();

  console.log('');
  console.log('Leitura:');
  console.log('- Tudo OK → abre o browser e faz a matriz do Passo C.');
  console.log('- FALTA origem → aplica a migração 015 (secção 2.1) e repete.');
  console.log('- FALTA checklist → confirma a migração do checklist (secção 2.2).');
}

main().catch((e) => {
  console.error('ERRO FATAL:', e.message);
  process.exit(1);
});