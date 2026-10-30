import { pool } from '../../../shared/db/pool.js';

const SELECT_BASE = `
  SELECT o.id, o.numero_os, o.estado, o.descricao_problema, o.valor_total,
         o.taxa_entrega, o.modalidade_entrega, o.data_conclusao, o.created_at,
         u.id AS utilizador_id
  FROM ordens_servico o
  JOIN clientes c ON c.id = o.cliente_id
  JOIN utilizadores u ON u.id = c.utilizador_id`;

const map = (r) => ({
  id: r.id,
  numeroOS: r.numero_os,
  estado: r.estado,
  descricaoProblema: r.descricao_problema,
  valorTotal: r.valor_total,
  taxaEntrega: r.taxa_entrega,
  modalidadeEntrega: r.modalidade_entrega,
  dataConclusao: r.data_conclusao,
  createdAt: r.created_at,
  utilizadorId: r.utilizador_id,
});

const mapHistorico = (r) => ({
  id: r.id,
  estadoAnterior: r.estado_anterior,
  estadoNovo: r.estado_novo,
  utilizadorId: r.utilizador_id,
  ocorridoAt: r.ocorrido_at,
  motivo: r.motivo,
});

export function criarPgOsRepository() {
  return {
    // RN02: estado inicial PENDENTE imposto aqui (nunca vem do browser).
    // RN03: histórico inicial gravado na MESMA transação.
    async criar({ clienteId, veiculoId, funcionarioId, descricaoProblema, orcamentoId }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO ordens_servico (numero_os, cliente_id, veiculo_id, funcionario_id, orcamento_id, descricao_problema, estado)
           VALUES ('TMP-' || gen_random_uuid(), $1, $2, $3, $4, $5, 'PENDENTE')
           RETURNING id`,
          [clienteId, veiculoId, funcionarioId, orcamentoId ?? null, descricaoProblema],
        );
        const id = rows[0].id;
        const { rows: upd } = await client.query(
          `UPDATE ordens_servico
           SET numero_os = 'OS-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 6, '0')
           WHERE id = $1 RETURNING numero_os`,
          [id],
        );
        await client.query(
          `INSERT INTO historico_estado (ordem_id, estado_anterior, estado_novo, utilizador_id)
           VALUES ($1, NULL, 'PENDENTE', $2)`,
          [id, funcionarioId],
        );
        await client.query('COMMIT');
        return { id, numeroOS: upd[0].numero_os, estado: 'PENDENTE' };
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

    async listarHistorico(ordemId) {
      const { rows } = await pool.query(
        `SELECT id, estado_anterior, estado_novo, utilizador_id, ocorrido_at, motivo
         FROM historico_estado WHERE ordem_id = $1 ORDER BY ocorrido_at ASC, id ASC`,
        [ordemId],
      );
      return rows.map(mapHistorico);
    },
  };
}