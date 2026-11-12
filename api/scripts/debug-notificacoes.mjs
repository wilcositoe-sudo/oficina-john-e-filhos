import { pool } from '../src/shared/db/pool.js';

const ordemId = Number(process.argv[2] || 0);

async function main() {
  if (!ordemId) {
    console.error('Uso: node --env-file=.env api\\scripts\\debug-notificacoes.mjs <ordemId>');
    process.exit(1);
  }

  console.log(`=== DEBUG NOTIFICAÇÕES OS ${ordemId} ===`);

  const os = await pool.query(
    `
      SELECT
        o.id AS ordem_id,
        o.numero_os,
        o.estado,
        o.cliente_id,
        o.mecanico_id,
        c.utilizador_id AS cliente_utilizador_id,
        u.nome AS cliente_nome,
        u.email AS cliente_email
      FROM ordens_servico o
      JOIN clientes c ON c.id = o.cliente_id
      JOIN utilizadores u ON u.id = c.utilizador_id
      WHERE o.id = $1::bigint
    `,
    [ordemId],
  );

  console.log('');
  console.log('== OS / cliente ==');
  console.table(os.rows);

  const notif = await pool.query(
    `
      SELECT
        n.id,
        n.ordem_id,
        n.destinatario_perfil,
        n.destinatario_id,
        n.titulo,
        n.corpo,
        n.tipo,
        n.created_at
      FROM notificacoes n
      WHERE n.ordem_id = $1::bigint
      ORDER BY n.id DESC
    `,
    [ordemId],
  );

  console.log('');
  console.log('== notificacoes da OS ==');
  console.table(notif.rows);

  const osRow = os.rows[0];
  const notifCliente = notif.rows.find((n) => n.destinatario_perfil === 'CLIENTE');

  console.log('');
  console.log('== leitura automática ==');

  if (!osRow) {
    console.log('OS não encontrada.');
  } else if (!notifCliente) {
    console.log('NÃO existe notificação para CLIENTE nesta OS.');
  } else if (String(notifCliente.destinatario_id) === String(osRow.cliente_utilizador_id)) {
    console.log('OK: notificação CLIENTE aponta para cliente_utilizador_id.');
  } else if (String(notifCliente.destinatario_id) === String(osRow.cliente_id)) {
    console.log('BUG CONFIRMADO: notificação CLIENTE aponta para cliente_id em vez de utilizador_id.');
  } else {
    console.log('ATENÇÃO: destinatário CLIENTE não bate nem com cliente_id nem com cliente_utilizador_id.');
  }

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});