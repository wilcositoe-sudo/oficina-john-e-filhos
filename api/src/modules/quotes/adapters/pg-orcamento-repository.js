import { pool } from '../../../shared/db/pool.js';

const SELECT_BASE = `
  SELECT o.id, o.numero, o.estado, o.descricao_problema, o.total_estimado,
         o.validade_ate, o.aprovado_at, o.created_at, u.id AS utilizador_id
  FROM orcamentos o
  JOIN clientes c ON c.id = o.cliente_id
  JOIN utilizadores u ON u.id = c.utilizador_id`;

const map = (r) => ({
  id: r.id,
  numero: r.numero,
  estado: r.estado,
  descricaoProblema: r.descricao_problema,
  totalEstimado: r.total_estimado,
  validadeAte: r.validade_ate,
  aprovadoAt: r.aprovado_at,
  createdAt: r.created_at,
  utilizadorId: r.utilizador_id,
});

export function criarPgOrcamentoRepository() {
  return {
    async criar({ utilizadorId, veiculoId, descricaoProblema }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO orcamentos (numero, cliente_id, veiculo_id, criado_por, estado, descricao_problema)
           SELECT 'TMP-' || gen_random_uuid(), c.id, $2, $1, 'SOLICITADO', $3
           FROM clientes c WHERE c.utilizador_id = $1
           RETURNING id`,
          [utilizadorId, veiculoId, descricaoProblema],
        );
        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null; // sem perfil cliente (não deve acontecer para CLIENTE autenticado)
        }
        const id = rows[0].id;
        const { rows: upd } = await client.query(
          `UPDATE orcamentos
           SET numero = 'ORC-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 6, '0')
           WHERE id = $1 RETURNING numero`,
          [id],
        );
        await client.query('COMMIT');
        return { id, numero: upd[0].numero, estado: 'SOLICITADO' };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(`${SELECT_BASE} WHERE o.id = $1`, [id]);
      return rows[0] ? map(rows[0]) : null;
    },

    async listarPorUtilizador(utilizadorId) {
      const { rows } = await pool.query(
        `${SELECT_BASE} WHERE u.id = $1 ORDER BY o.created_at DESC`,
        [utilizadorId],
      );
      return rows.map(map);
    },

    async listarTodos() {
      const { rows } = await pool.query(`${SELECT_BASE} ORDER BY o.created_at DESC`);
      return rows.map(map);
    },

    async gravarResposta({ id, linhas, totalEstimado, validadeAte }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM linhas_orcamento WHERE orcamento_id = $1', [id]);
        for (const l of linhas) {
          await client.query(
            `INSERT INTO linhas_orcamento (orcamento_id, descricao_snapshot, quantidade, preco_unitario, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, l.descricao, l.quantidade, l.precoUnitario, l.subtotal],
          );
        }
        const { rows } = await client.query(
          `UPDATE orcamentos
           SET estado = 'ENVIADO', total_estimado = $2, validade_ate = $3, updated_at = now()
           WHERE id = $1
           RETURNING id, numero, estado, descricao_problema, total_estimado, validade_ate, aprovado_at, created_at,
             (SELECT u.id FROM orcamentos o2 JOIN clientes c ON c.id = o2.cliente_id JOIN utilizadores u ON u.id = c.utilizador_id WHERE o2.id = $1) AS utilizador_id`,
          [id, totalEstimado, validadeAte],
        );
        await client.query('COMMIT');
        return map(rows[0]);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async decidir({ id, estado, aprovadoAt }) {
      const { rows } = await pool.query(
        `UPDATE orcamentos SET estado = $2, aprovado_at = $3, updated_at = now()
         WHERE id = $1 AND estado = 'ENVIADO'
         RETURNING id, numero, estado, descricao_problema, total_estimado, validade_ate, aprovado_at, created_at,
           (SELECT u.id FROM orcamentos o2 JOIN clientes c ON c.id = o2.cliente_id JOIN utilizadores u ON u.id = c.utilizador_id WHERE o2.id = $1) AS utilizador_id`,
        [id, estado, aprovadoAt],
      );
      return rows[0] ? map(rows[0]) : null;
    },
  };
}