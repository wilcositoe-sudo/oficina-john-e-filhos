import { pool } from '../src/shared/db/pool.js';

const arg = Number(process.argv[2] || 0);

async function resolverOrdemId() {
  if (arg) return arg;

  const concluida = await pool.query(`
    SELECT id
    FROM ordens_servico
    WHERE estado = 'CONCLUIDA'
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
  `);

  if (concluida.rows[0]) {
    console.log(`Encontrada última OS CONCLUIDA: id=${concluida.rows[0].id}`);
    return Number(concluida.rows[0].id);
  }

  const ultima = await pool.query(`
    SELECT id, estado
    FROM ordens_servico
    ORDER BY id DESC
    LIMIT 1
  `);

  if (!ultima.rows[0]) {
    throw new Error('Não existe nenhuma OS no banco.');
  }

  console.log(`Não encontrei OS CONCLUIDA. A usar última OS: id=${ultima.rows[0].id}, estado=${ultima.rows[0].estado}`);
  return Number(ultima.rows[0].id);
}

async function main() {
  const ordemId = await resolverOrdemId();

  console.log('');
  console.log(`=== DEBUG NOTIFICAÇÕES OS ${ordemId} ===`);

  const os = await pool.query(`
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
  `, [ordemId]);

  console.log('');
  console.log('== OS / cliente ==');
  console.table(os.rows);

  if (!os.rows[0]) {
    console.log('OS não encontrada.');
    await pool.end();
    return;
  }

  const notif = await pool.query(`
    SELECT *
    FROM notificacoes
    WHERE ordem_id = $1::bigint
    ORDER BY id DESC
  `, [ordemId]);

  console.log('');
  console.log('== notificacoes brutas da OS ==');

  if (notif.rows.length === 0) {
    console.log('Nenhuma notificação encontrada para esta OS.');
  } else {
    console.log('Colunas retornadas:');
    console.log(Object.keys(notif.rows[0]).join(', '));
    console.table(notif.rows);
  }

  const osRow = os.rows[0];

  const notifCliente = notif.rows.find((n) => {
    const perfil = n.destinatario_perfil ?? n.perfil ?? n.destinatarioPerfil;
    return String(perfil ?? '').toUpperCase() === 'CLIENTE';
  });

  console.log('');
  console.log('== leitura automática ==');

  if (!notifCliente) {
    console.log('NÃO existe notificação para CLIENTE nesta OS.');
  } else {
    const destinatario =
      notifCliente.destinatario_id ??
      notifCliente.destinatarioId ??
      notifCliente.destinatario;

    console.log(`Notificação CLIENTE encontrada.`);
    console.log(`destinatario_id na notificação: ${destinatario}`);
    console.log(`cliente_id da OS:               ${osRow.cliente_id}`);
    console.log(`cliente_utilizador_id:          ${osRow.cliente_utilizador_id}`);

    if (String(destinatario) === String(osRow.cliente_utilizador_id)) {
      console.log('OK: notificação CLIENTE aponta para cliente_utilizador_id.');
    } else if (String(destinatario) === String(osRow.cliente_id)) {
      console.log('BUG CONFIRMADO: notificação CLIENTE aponta para cliente_id em vez de utilizador_id.');
    } else {
      console.log('ATENÇÃO: destinatário CLIENTE não bate nem com cliente_id nem com cliente_utilizador_id.');
    }
  }

  await pool.end();
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});