import { pool } from '../src/shared/db/pool.js';

async function main() {
  console.log('=== Corrigir notificacoes CLIENTE: cliente_id -> utilizador_id ===');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const preview = await client.query(`
      SELECT
        n.id AS notificacao_id,
        n.ordem_id,
        o.numero_os,
        n.destinatario_perfil,
        n.destinatario_id AS destinatario_atual,
        o.cliente_id,
        c.utilizador_id AS destinatario_correcto,
        n.titulo
      FROM notificacoes n
      JOIN ordens_servico o ON o.id = n.ordem_id
      JOIN clientes c ON c.id = o.cliente_id
      JOIN utilizadores u ON u.id = c.utilizador_id
      WHERE n.destinatario_perfil = 'CLIENTE'
        AND n.destinatario_id = o.cliente_id
      ORDER BY n.id DESC
      LIMIT 50
    `);

    console.log('');
    console.log('== Candidatas a correcção ==');
    console.table(preview.rows);

    if (preview.rows.length === 0) {
      console.log('Nenhuma notificação CLIENTE encontrada com destinatario_id = cliente_id.');
      await client.query('ROLLBACK');
      return;
    }

    const update = await client.query(`
      WITH alvos AS (
        SELECT
          n.id AS notificacao_id,
          u.id AS utilizador_id
        FROM notificacoes n
        JOIN ordens_servico o ON o.id = n.ordem_id
        JOIN clientes c ON c.id = o.cliente_id
        JOIN utilizadores u ON u.id = c.utilizador_id
        WHERE n.destinatario_perfil = 'CLIENTE'
          AND n.destinatario_id = o.cliente_id
      )
      UPDATE notificacoes n
      SET destinatario_id = a.utilizador_id
      FROM alvos a
      WHERE n.id = a.notificacao_id
      RETURNING n.id, n.ordem_id, n.destinatario_perfil, n.destinatario_id
    `);

    console.log('');
    console.log(`Actualizadas: ${update.rowCount}`);
    console.table(update.rows);

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});