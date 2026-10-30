import { pool } from '../../../shared/db/pool.js';
import { erros } from '../../../shared/errors/domain-error.js';

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

// RN05: total = serviços + peças + taxa — sempre derivado no servidor, nunca do browser.
const SQL_RECOMPUTAR_TOTAL = `
  UPDATE ordens_servico
  SET valor_total = COALESCE((SELECT SUM(subtotal) FROM servicos_os WHERE ordem_id = $1::bigint), 0)
                  + COALESCE((SELECT SUM(subtotal) FROM pecas_os WHERE ordem_id = $1::bigint), 0)
                  + taxa_entrega,
      updated_at = now()
  WHERE id = $1::bigint RETURNING valor_total`;

const SQL_PROPRIETARIO = `
  (SELECT u.id FROM ordens_servico o2
   JOIN clientes c ON c.id = o2.cliente_id
   JOIN utilizadores u ON u.id = c.utilizador_id
   WHERE o2.id = $1::bigint) AS utilizador_id`;

export function criarPgOsRepository() {
  return {
    async criar({ clienteId, veiculoId, funcionarioId, descricaoProblema, orcamentoId }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `INSERT INTO ordens_servico (numero_os, cliente_id, veiculo_id, funcionario_id, orcamento_id, descricao_problema, estado)
           VALUES ('TMP-' || gen_random_uuid(), $1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::text, 'PENDENTE')
           RETURNING id`,
          [clienteId, veiculoId, funcionarioId, orcamentoId ?? null, descricaoProblema],
        );
        const id = rows[0].id;
        const { rows: upd } = await client.query(
          `UPDATE ordens_servico
           SET numero_os = 'OS-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 6, '0')
           WHERE id = $1::bigint RETURNING numero_os`,
          [id],
        );
        await client.query(
          `INSERT INTO historico_estado (ordem_id, estado_anterior, estado_novo, utilizador_id)
           VALUES ($1::bigint, NULL, 'PENDENTE', $2::bigint)`,
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
      const { rows } = await pool.query(`${SELECT_BASE} WHERE o.id = $1::bigint`, [id]);
      return rows[0] ? map(rows[0]) : null;
    },

    async listarPorUtilizador(utilizadorId) {
      const { rows } = await pool.query(
        `${SELECT_BASE} WHERE u.id = $1::bigint ORDER BY o.created_at DESC`,
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
         FROM historico_estado WHERE ordem_id = $1::bigint ORDER BY ocorrido_at ASC, id ASC`,
        [ordemId],
      );
      return rows.map(mapHistorico);
    },

    async adicionarServico({ ordemId, servicoId, quantidade }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: s } = await client.query(
          `SELECT id, nome, preco_base, ativo FROM servicos WHERE id = $1::bigint FOR UPDATE`,
          [servicoId],
        );
        if (!s[0]) {
          await client.query('ROLLBACK');
          throw erros.servicoNaoEncontrado();
        }
        if (!s[0].ativo) {
          await client.query('ROLLBACK');
          throw erros.servicoInativo();
        }
        const { rows: linha } = await client.query(
          `INSERT INTO servicos_os (ordem_id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal)
           VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, $5::numeric, $5::numeric * $4::numeric)
           RETURNING id, descricao_snapshot, quantidade, preco_unitario, subtotal`,
          [ordemId, servicoId, s[0].nome, quantidade, s[0].preco_base],
        );
        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);
        await client.query('COMMIT');
        return { linha: linha[0], valorTotal: total[0].valor_total };
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async adicionarPeca({ ordemId, pecaId, quantidade }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: p } = await client.query(
          `UPDATE pecas
           SET quantidade_stock = quantidade_stock - $2::int
           WHERE id = $1::bigint AND ativo = TRUE AND quantidade_stock >= $2::int
           RETURNING id, nome, preco_unitario`,
          [pecaId, quantidade],
        );
        if (!p[0]) {
          await client.query('ROLLBACK');
          const { rows: existe } = await pool.query(
            'SELECT ativo, quantidade_stock FROM pecas WHERE id = $1::bigint',
            [pecaId],
          );
          if (!existe[0]) throw erros.pecaNaoEncontrada();
          throw erros.stockInsuficiente();
        }
        const { rows: linha } = await client.query(
          `INSERT INTO pecas_os (ordem_id, peca_id, quantidade, preco_unitario, subtotal)
           VALUES ($1::bigint, $2::bigint, $3::int, $4::numeric, $4::numeric * $3::int)
           RETURNING id, quantidade, preco_unitario, subtotal`,
          [ordemId, pecaId, quantidade, p[0].preco_unitario],
        );
        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);
        await client.query('COMMIT');
        return { linha: linha[0], valorTotal: total[0].valor_total };
      } catch (err) {
        if (client) await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async listarLinhas(ordemId) {
      const { rows: servicos } = await pool.query(
        `SELECT id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal
         FROM servicos_os WHERE ordem_id = $1::bigint ORDER BY id`,
        [ordemId],
      );
      const { rows: pecas } = await pool.query(
        `SELECT id, peca_id, quantidade, preco_unitario, subtotal
         FROM pecas_os WHERE ordem_id = $1::bigint ORDER BY id`,
        [ordemId],
      );
      return { servicos, pecas };
    },

    async contarServicos(ordemId) {
      const { rows } = await pool.query(
        'SELECT COUNT(*)::int AS n FROM servicos_os WHERE ordem_id = $1::bigint',
        [ordemId],
      );
      return rows[0].n;
    },

    // RF07 — modalidade e taxa persistidas; total recomputado na mesma transação
    async definirEntrega({ ordemId, modalidade, taxaEntrega }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE ordens_servico
           SET modalidade_entrega = $2::text, taxa_entrega = $3::numeric, updated_at = now()
           WHERE id = $1::bigint`,
          [ordemId, modalidade, taxaEntrega],
        );
        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);
        const { rows } = await client.query(`${SELECT_BASE} WHERE o.id = $1::bigint`, [ordemId]);
        await client.query('COMMIT');
        return { ...map(rows[0]), valorTotal: total[0].valor_total };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async transitar({ ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE ordens_servico
           SET estado = $2::text,
               data_conclusao = CASE WHEN $2::text = 'CONCLUIDA' THEN now() ELSE data_conclusao END,
               updated_at = now()
           WHERE id = $1::bigint AND estado = $3::text
           RETURNING id, numero_os, estado, descricao_problema, valor_total, taxa_entrega,
                     modalidade_entrega, data_conclusao, created_at, ${SQL_PROPRIETARIO}`,
          [ordemId, estadoNovo, estadoAnterior],
        );
        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }
        await client.query(
          `INSERT INTO historico_estado (ordem_id, estado_anterior, estado_novo, utilizador_id, motivo)
           VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
          [ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo ?? null],
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
  };
}