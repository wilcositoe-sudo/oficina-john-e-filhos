import { pool } from '../src/shared/db/pool.js';

const ordemId = Number(process.argv[2] || 63);

async function main() {
  console.log(`=== DEBUG OS ${ordemId} ===`);

  const os = await pool.query(
    `
      SELECT
        id,
        numero_os,
        estado,
        mecanico_id,
        cliente_id,
        valor_total,
        taxa_diagnostico,
        diagnostico_cobrado,
        modalidade_entrega,
        taxa_entrega,
        data_conclusao,
        created_at,
        updated_at
      FROM ordens_servico
      WHERE id = $1::bigint
    `,
    [ordemId],
  );

  console.log('');
  console.log('== ordens_servico ==');
  console.table(os.rows);

  if (!os.rows[0]) {
    console.log('OS não encontrada.');
    await pool.end();
    return;
  }

  const servicos = await pool.query(
    `
      SELECT
        id,
        servico_id,
        descricao_snapshot,
        quantidade,
        preco_unitario,
        subtotal,
        precificado,
        origem,
        pendente_remocao
      FROM servicos_os
      WHERE ordem_id = $1::bigint
      ORDER BY id
    `,
    [ordemId],
  );

  const pecas = await pool.query(
    `
      SELECT
        id,
        peca_id,
        descricao_snapshot,
        quantidade,
        preco_unitario,
        subtotal,
        precificado,
        origem,
        pendente_remocao
      FROM pecas_os
      WHERE ordem_id = $1::bigint
      ORDER BY id
    `,
    [ordemId],
  );

  const contagens = await pool.query(
    `
      SELECT
        (SELECT COUNT(*)::int FROM servicos_os WHERE ordem_id = $1::bigint) AS total_servicos,
        (SELECT COUNT(*)::int FROM pecas_os WHERE ordem_id = $1::bigint) AS total_pecas,
        (SELECT COUNT(*)::int FROM servicos_os WHERE ordem_id = $1::bigint AND precificado = TRUE) AS servicos_precificados,
        (SELECT COUNT(*)::int FROM pecas_os WHERE ordem_id = $1::bigint AND precificado = TRUE) AS pecas_precificadas,
        (SELECT COUNT(*)::int FROM servicos_os WHERE ordem_id = $1::bigint AND pendente_remocao = TRUE) AS servicos_pendentes_remocao,
        (SELECT COUNT(*)::int FROM pecas_os WHERE ordem_id = $1::bigint AND pendente_remocao = TRUE) AS pecas_pendentes_remocao,
        (SELECT COUNT(*)::int FROM diagnostico_checklist WHERE ordem_id = $1::bigint) AS checklist_itens
    `,
    [ordemId],
  );

  const historico = await pool.query(
    `
      SELECT
        id,
        estado_anterior,
        estado_novo,
        utilizador_id,
        motivo,
        ocorrido_at
      FROM historico_estado
      WHERE ordem_id = $1::bigint
      ORDER BY ocorrido_at ASC, id ASC
    `,
    [ordemId],
  );

  const mecanicos = await pool.query(
    `
      SELECT
        u.id,
        u.nome,
        u.email,
        u.perfil,
        u.ativo
      FROM utilizadores u
      WHERE u.perfil = 'MECANICO'
      ORDER BY u.id DESC
      LIMIT 20
    `,
  );

  console.log('');
  console.log('== contagens ==');
  console.table(contagens.rows);

  console.log('');
  console.log('== servicos_os ==');
  console.table(servicos.rows);

  console.log('');
  console.log('== pecas_os ==');
  console.table(pecas.rows);

  console.log('');
  console.log('== historico_estado ==');
  console.table(historico.rows);

  console.log('');
  console.log('== mecanicos disponiveis ==');
  console.table(mecanicos.rows);

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});