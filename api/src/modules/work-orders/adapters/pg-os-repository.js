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
        // --- F12: Atribuição ao Mecânico ---
    async atribuirMecanico({ ordemId, mecanicoId }) {
      const { rows } = await pool.query(
        `UPDATE ordens_servico SET mecanico_id = $2, updated_at = now()
         WHERE id = $1::bigint RETURNING id, numero_os, estado, mecanico_id`,
        [ordemId, mecanicoId],
      );
      return rows[0] ?? null;
    },

    async listarPorMecanico(mecanicoId) {
      const { rows } = await pool.query(
        `SELECT id, numero_os, cliente_id, veiculo_id, descricao_problema, estado,
                valor_total, taxa_diagnostico, modalidade_entrega, taxa_entrega,
                created_at, data_conclusao
         FROM ordens_servico
         WHERE mecanico_id = $1::bigint AND estado NOT IN ('ENTREGUE','CANCELADA','REJEITADA')
         ORDER BY created_at DESC`,
        [mecanicoId],
      );
      return rows.map(mapRow);
    },

    // --- F12: Diagnóstico (Mecânico adiciona linhas SEM preço) ---
    async lancarServicoSemPreco({ ordemId, servicoId, quantidade, descricaoSnapshot }) {
      const { rows } = await pool.query(
        `INSERT INTO servicos_os (ordem_id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal, precificado)
         VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, 0, 0, FALSE)
         RETURNING id, ordem_id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal, precificado`,
        [ordemId, servicoId, descricaoSnapshot, quantidade],
      );
      return rows[0];
    },

    async lancarPecaSemPreco({ ordemId, pecaId, quantidade }) {
      const { rows } = await pool.query(
        `INSERT INTO pecas_os (ordem_id, peca_id, quantidade, preco_unitario, subtotal, precificado)
         VALUES ($1::bigint, $2::bigint, $3::integer, 0, 0, FALSE)
         RETURNING id, ordem_id, peca_id, quantidade, preco_unitario, subtotal, precificado`,
        [ordemId, pecaId, quantidade],
      );
      return rows[0];
    },

    // --- F12: Precificação (Funcionário atribui preços) ---
    async precificarLinhaServico({ linhaId, precoUnitario }) {
      const subtotal = (Number(precoUnitario) * 1).toFixed(2);
      const { rows } = await pool.query(
        `UPDATE servicos_os SET preco_unitario = $2::numeric, subtotal = $2::numeric * quantidade, precificado = TRUE
         WHERE id = $1::bigint RETURNING id, preco_unitario, subtotal, precificado`,
        [linhaId, precoUnitario],
      );
      return rows[0] ?? null;
    },

    async precificarLinhaPeca({ linhaId, precoUnitario }) {
      const { rows } = await pool.query(
        `UPDATE pecas_os SET preco_unitario = $2::numeric, subtotal = $2::numeric * quantidade, precificado = TRUE
         WHERE id = $1::bigint RETURNING id, preco_unitario, subtotal, precificado`,
        [linhaId, precoUnitario],
      );
      return rows[0] ?? null;
    },

    async definirTaxaDiagnostico({ ordemId, taxa }) {
      await pool.query(
        `UPDATE ordens_servico SET taxa_diagnostico = $2::numeric, updated_at = now() WHERE id = $1::bigint`,
        [ordemId, taxa],
      );
    },

    // --- F12: Decisão do Cliente ---
    async rejeitarComCobrancaDiagnostico({ ordemId }) {
      const { rows } = await pool.query(
        `UPDATE ordens_servico
         SET estado = 'REJEITADA',
             valor_total = taxa_diagnostico,
             diagnostico_cobrado = TRUE,
             data_conclusao = now(),
             updated_at = now()
         WHERE id = $1::bigint AND diagnostico_cobrado = FALSE
         RETURNING id, numero_os, estado, valor_total, taxa_diagnostico`,
        [ordemId],
      );
      return rows[0] ?? null;
    },

    async removerLinhaServico({ linhaId }) {
      await pool.query(`DELETE FROM servicos_os WHERE id = $1::bigint AND precificado = FALSE`, [linhaId]);
    },

    async removerLinhaPeca({ linhaId }) {
      await pool.query(`DELETE FROM pecas_os WHERE id = $1::bigint AND precificado = FALSE`, [linhaId]);
    },

    // --- F12: Recalcular total (após cortes ou aprovação) ---
    async recalcularTotal(ordemId) {
      const { rows } = await pool.query(
        `SELECT
           COALESCE(SUM(s.subtotal), 0) + COALESCE(SUM(p.subtotal), 0) + COALESCE(o.taxa_entrega, 0) AS total
         FROM ordens_servico o
         LEFT JOIN servicos_os s ON s.ordem_id = o.id
         LEFT JOIN pecas_os p ON p.ordem_id = o.id
         WHERE o.id = $1::bigint`,
        [ordemId],
      );
      const total = rows[0]?.total ?? '0.00';
      await pool.query(
        `UPDATE ordens_servico SET valor_total = $2::numeric, updated_at = now() WHERE id = $1::bigint`,
        [ordemId, total],
      );
      return total;
    },
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