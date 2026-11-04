import { pool } from '../../../shared/db/pool.js';
import { erros } from '../../../shared/errors/domain-error.js';

const SELECT_COLS = `
  o.id,
  o.numero_os,
  o.cliente_id,
  o.veiculo_id,
  o.mecanico_id,
  o.estado,
  o.descricao_problema,
  o.valor_total,
  o.taxa_entrega,
  o.modalidade_entrega,
  o.taxa_diagnostico,
  o.diagnostico_cobrado,
  o.data_conclusao,
  o.created_at,
  u.id AS utilizador_id`;

const SELECT_BASE = `
  SELECT ${SELECT_COLS}
  FROM ordens_servico o
  JOIN clientes c ON c.id = o.cliente_id
  JOIN utilizadores u ON u.id = c.utilizador_id`;

const map = (r) => ({
  id: r.id,
  numeroOS: r.numero_os,
  clienteId: r.cliente_id,
  veiculoId: r.veiculo_id,
  mecanicoId: r.mecanico_id ?? null,
  estado: r.estado,
  descricaoProblema: r.descricao_problema,
  valorTotal: r.valor_total,
  taxaEntrega: r.taxa_entrega ?? '0.00',
  modalidadeEntrega: r.modalidade_entrega ?? null,
  taxaDiagnostico: r.taxa_diagnostico ?? '0.00',
  diagnosticoCobrado: Boolean(r.diagnostico_cobrado),
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

// RN05: total = serviços + peças + taxa de entrega.
// A taxa de diagnóstico NÃO entra aqui normalmente.
// Só passa a ser o valor_total se o cliente REJEITAR o orçamento.
const SQL_RECOMPUTAR_TOTAL = `
  UPDATE ordens_servico
  SET valor_total = COALESCE((SELECT SUM(subtotal) FROM servicos_os WHERE ordem_id = $1::bigint), 0)
                  + COALESCE((SELECT SUM(subtotal) FROM pecas_os WHERE ordem_id = $1::bigint), 0)
                  + COALESCE(taxa_entrega, 0),
      updated_at = now()
  WHERE id = $1::bigint
  RETURNING valor_total`;

const SQL_PROPRIETARIO = `
  (SELECT u.id
   FROM ordens_servico o2
   JOIN clientes c ON c.id = o2.cliente_id
   JOIN utilizadores u ON u.id = c.utilizador_id
   WHERE o2.id = $1::bigint) AS utilizador_id`;

// Colunas para RETURNING em UPDATE, substituindo o join por subquery.
// ✅ DEPOIS — colunas SEM prefixo de tabela, válidas em UPDATE … RETURNING.
// O utilizador_id vem da subquery SQL_PROPRIETARIO (usa $1::bigint = ordemId).
const RETURNING_COLS = `
  id, numero_os, cliente_id, veiculo_id, mecanico_id, estado, descricao_problema,
  valor_total, taxa_entrega, modalidade_entrega, taxa_diagnostico, diagnostico_cobrado,
  data_conclusao, created_at, ${SQL_PROPRIETARIO}`;
export function criarPgOsRepository() {
  return {
    // ============================================================
    // F12 — Atribuição ao Mecânico
    // ============================================================
    async atribuirMecanico({ ordemId, mecanicoId }) {
      const { rows } = await pool.query(
        `UPDATE ordens_servico
         SET mecanico_id = $2::bigint,
             updated_at = now()
         WHERE id = $1::bigint
         RETURNING id, numero_os, estado, mecanico_id`,
        [ordemId, mecanicoId],
      );
      return rows[0] ?? null;
    },

    async listarPorMecanico(mecanicoId) {
      const { rows } = await pool.query(
        `${SELECT_BASE}
         WHERE o.mecanico_id = $1::bigint
           AND o.estado NOT IN ('ENTREGUE','CANCELADA','REJEITADA')
         ORDER BY o.created_at DESC`,
        [mecanicoId],
      );
      return rows.map(map);
    },

    // ============================================================
    // F12 — Diagnóstico (Mecânico lança SEM preço)
    // ============================================================
    async lancarServicoSemPreco({ ordemId, servicoId, quantidade, descricaoSnapshot }) {
      const { rows: servico } = await pool.query(
        `SELECT nome, ativo
         FROM servicos
         WHERE id = $1::bigint`,
        [servicoId],
      );

      if (!servico[0]) throw erros.servicoNaoEncontrado();
      if (!servico[0].ativo) throw erros.servicoInativo();

      const qtd = Number(quantidade ?? 1);
      if (!Number.isFinite(qtd) || qtd <= 0) {
        throw erros.contaInternaInvalida('Quantidade inválida.');
      }

      const descricao = (descricaoSnapshot?.trim() || servico[0].nome);

      const { rows } = await pool.query(
        `INSERT INTO servicos_os (
           ordem_id,
           servico_id,
           descricao_snapshot,
           quantidade,
           preco_unitario,
           subtotal,
           precificado
         )
         VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, 0, 0, FALSE)
         RETURNING id, ordem_id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal, precificado`,
        [ordemId, servicoId, descricao, qtd],
      );

      return rows[0];
    },

    async lancarPecaSemPreco({ ordemId, pecaId, quantidade }) {
      const { rows: peca } = await pool.query(
        `SELECT nome, ativo
         FROM pecas
         WHERE id = $1::bigint`,
        [pecaId],
      );

      if (!peca[0]) throw erros.pecaNaoEncontrada();
      if (!peca[0].ativo) {
        throw erros.contaInternaInvalida('A peça está inativa e não pode ser proposta.');
      }

      const qtd = Number(quantidade ?? 1);
      if (!Number.isFinite(qtd) || qtd <= 0) {
        throw erros.contaInternaInvalida('Quantidade inválida.');
      }

      const { rows } = await pool.query(
        `INSERT INTO pecas_os (
           ordem_id,
           peca_id,
           quantidade,
           preco_unitario,
           subtotal,
           precificado
         )
         VALUES ($1::bigint, $2::bigint, $3::int, 0, 0, FALSE)
         RETURNING id, ordem_id, peca_id, quantidade, preco_unitario, subtotal, precificado`,
        [ordemId, pecaId, qtd],
      );

      return rows[0];
    },

    // ============================================================
    // F12 — Precificação (Funcionário atribui preços)
    // ============================================================
    async precificarLinhaServico({ linhaId, precoUnitario }) {
      const preco = Number(precoUnitario);
      if (!Number.isFinite(preco) || preco < 0) {
        throw erros.contaInternaInvalida('Preço unitário inválido.');
      }

      const { rows } = await pool.query(
        `UPDATE servicos_os
         SET preco_unitario = $2::numeric,
             subtotal = $2::numeric * quantidade,
             precificado = TRUE
         WHERE id = $1::bigint
         RETURNING id, preco_unitario, subtotal, precificado`,
        [linhaId, preco],
      );

      return rows[0] ?? null;
    },

    async precificarLinhaPeca({ linhaId, precoUnitario }) {
      const preco = Number(precoUnitario);
      if (!Number.isFinite(preco) || preco < 0) {
        throw erros.contaInternaInvalida('Preço unitário inválido.');
      }

      const { rows } = await pool.query(
        `UPDATE pecas_os
         SET preco_unitario = $2::numeric,
             subtotal = $2::numeric * quantidade,
             precificado = TRUE
         WHERE id = $1::bigint
         RETURNING id, preco_unitario, subtotal, precificado`,
        [linhaId, preco],
      );

      return rows[0] ?? null;
    },

    async definirTaxaDiagnostico({ ordemId, taxa }) {
      const valor = Number(taxa ?? 0);
      if (!Number.isFinite(valor) || valor < 0) {
        throw erros.taxaDiagnosticoInvalida();
      }

      await pool.query(
        `UPDATE ordens_servico
         SET taxa_diagnostico = $2::numeric,
             updated_at = now()
         WHERE id = $1::bigint`,
        [ordemId, valor],
      );
    },

    // ============================================================
    // F12 — Decisão do Cliente
    // ============================================================

    // CORREÇÃO CRÍTICA:
    // Antes tinha AND precificado = FALSE.
    // Isso impedia o cliente de remover itens já precificados, causando falha silenciosa.
    async removerLinhaServico({ linhaId }) {
      const { rowCount } = await pool.query(
        `DELETE FROM servicos_os
         WHERE id = $1::bigint`,
        [linhaId],
      );
      return rowCount > 0;
    },

    async removerLinhaPeca({ linhaId }) {
      const { rowCount } = await pool.query(
        `DELETE FROM pecas_os
         WHERE id = $1::bigint`,
        [linhaId],
      );
      return rowCount > 0;
    },

    async rejeitarComCobrancaDiagnostico({ ordemId, utilizadorId }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows: atual } = await client.query(
          `SELECT estado, diagnostico_cobrado
           FROM ordens_servico
           WHERE id = $1::bigint
           FOR UPDATE`,
          [ordemId],
        );

        if (!atual[0] || atual[0].diagnostico_cobrado) {
          await client.query('ROLLBACK');
          return null;
        }

        const { rows } = await client.query(
          `UPDATE ordens_servico
           SET estado = 'REJEITADA',
               valor_total = COALESCE(taxa_diagnostico, 0),
               diagnostico_cobrado = TRUE,
               data_conclusao = now(),
               updated_at = now()
           WHERE id = $1::bigint
           RETURNING ${RETURNING_COLS}`,
          [ordemId],
        );

        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }

        if (utilizadorId) {
          await client.query(
            `INSERT INTO historico_estado (
               ordem_id,
               estado_anterior,
               estado_novo,
               utilizador_id,
               motivo
             )
             VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
            [ordemId, atual[0].estado, 'REJEITADA', utilizadorId, 'Cliente rejeitou o orçamento'],
          );
        }

        await client.query('COMMIT');
        return map(rows[0]);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    // ============================================================
    // F12 — Recalcular total
    // ============================================================

    // CORREÇÃO CRÍTICA:
    // A versão anterior fazia LEFT JOIN servicos_os e pecas_os ao mesmo tempo.
    // Se houvesse 2 serviços e 2 peças, o PostgreSQL criava produto cartesiano
    // e multiplicava os subtotais. Agora usa subqueries independentes.
    async recalcularTotal(ordemId) {
      const { rows } = await pool.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);
      return rows[0]?.valor_total ?? '0.00';
    },

    // ============================================================
    // Núcleo existente — OS
    // ============================================================
    async criar({ clienteId, veiculoId, funcionarioId, descricaoProblema, orcamentoId }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows } = await client.query(
          `INSERT INTO ordens_servico (
             numero_os,
             cliente_id,
             veiculo_id,
             funcionario_id,
             orcamento_id,
             descricao_problema,
             estado
           )
           VALUES (
             'TMP-' || gen_random_uuid(),
             $1::bigint,
             $2::bigint,
             $3::bigint,
             $4::bigint,
             $5::text,
             'PENDENTE'
           )
           RETURNING id`,
          [clienteId, veiculoId, funcionarioId, orcamentoId ?? null, descricaoProblema],
        );

        const id = rows[0].id;

        const { rows: upd } = await client.query(
          `UPDATE ordens_servico
           SET numero_os = 'OS-' || to_char(now(), 'YYYY') || '-' || lpad(id::text, 6, '0')
           WHERE id = $1::bigint
           RETURNING numero_os`,
          [id],
        );

        await client.query(
          `INSERT INTO historico_estado (
             ordem_id,
             estado_anterior,
             estado_novo,
             utilizador_id
           )
           VALUES ($1::bigint, NULL, 'PENDENTE', $2::bigint)`,
          [id, funcionarioId],
        );

        await client.query('COMMIT');

        return {
          id,
          numeroOS: upd[0].numero_os,
          estado: 'PENDENTE',
        };
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
         FROM historico_estado
         WHERE ordem_id = $1::bigint
         ORDER BY ocorrido_at ASC, id ASC`,
        [ordemId],
      );
      return rows.map(mapHistorico);
    },

    // ============================================================
    // Núcleo existente — Linhas com preço (fluxo antigo/staff)
    // ============================================================
    async adicionarServico({ ordemId, servicoId, quantidade }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const { rows: s } = await client.query(
          `SELECT id, nome, preco_base, ativo
           FROM servicos
           WHERE id = $1::bigint
           FOR UPDATE`,
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
          `INSERT INTO servicos_os (
             ordem_id,
             servico_id,
             descricao_snapshot,
             quantidade,
             preco_unitario,
             subtotal
           )
           VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, $5::numeric, $5::numeric * $4::numeric)
           RETURNING id, descricao_snapshot, quantidade, preco_unitario, subtotal`,
          [ordemId, servicoId, s[0].nome, quantidade, s[0].preco_base],
        );

        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);

        await client.query('COMMIT');

        return {
          linha: linha[0],
          valorTotal: total[0].valor_total,
        };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
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
           WHERE id = $1::bigint
             AND ativo = TRUE
             AND quantidade_stock >= $2::int
           RETURNING id, nome, preco_unitario`,
          [pecaId, quantidade],
        );

        if (!p[0]) {
          await client.query('ROLLBACK');

          const { rows: existe } = await pool.query(
            `SELECT ativo, quantidade_stock
             FROM pecas
             WHERE id = $1::bigint`,
            [pecaId],
          );

          if (!existe[0]) throw erros.pecaNaoEncontrada();
          throw erros.stockInsuficiente();
        }

        const { rows: linha } = await client.query(
          `INSERT INTO pecas_os (
             ordem_id,
             peca_id,
             quantidade,
             preco_unitario,
             subtotal
           )
           VALUES ($1::bigint, $2::bigint, $3::int, $4::numeric, $4::numeric * $3::int)
           RETURNING id, quantidade, preco_unitario, subtotal`,
          [ordemId, pecaId, quantidade, p[0].preco_unitario],
        );

        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);

        await client.query('COMMIT');

        return {
          linha: linha[0],
          valorTotal: total[0].valor_total,
        };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async listarLinhas(ordemId) {
      const { rows: servicos } = await pool.query(
        `SELECT id, servico_id, descricao_snapshot, quantidade, preco_unitario, subtotal, precificado
         FROM servicos_os
         WHERE ordem_id = $1::bigint
         ORDER BY id`,
        [ordemId],
      );

      const { rows: pecas } = await pool.query(
        `SELECT id, peca_id, quantidade, preco_unitario, subtotal, precificado
         FROM pecas_os
         WHERE ordem_id = $1::bigint
         ORDER BY id`,
        [ordemId],
      );

      return { servicos, pecas };
    },

    async contarServicos(ordemId) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM servicos_os
         WHERE ordem_id = $1::bigint`,
        [ordemId],
      );
      return rows[0].n;
    },

    // ============================================================
    // RF07 — Entrega
    // ============================================================
    async definirEntrega({ ordemId, modalidade, taxaEntrega }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE ordens_servico
           SET modalidade_entrega = $2::text,
               taxa_entrega = $3::numeric,
               updated_at = now()
           WHERE id = $1::bigint`,
          [ordemId, modalidade, taxaEntrega],
        );

        const { rows: total } = await client.query(SQL_RECOMPUTAR_TOTAL, [ordemId]);
        const { rows } = await client.query(`${SELECT_BASE} WHERE o.id = $1::bigint`, [ordemId]);

        await client.query('COMMIT');

        return {
          ...map(rows[0]),
          valorTotal: total[0].valor_total,
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // ============================================================
    // Máquina de estados — transição
    // ============================================================

    // Compatível com:
    // 1) { id, estado, utilizadorId, motivo }
    // 2) { ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo }
    async transitar(params) {
      const ordemId = params.ordemId ?? params.id;
      const estadoNovo = params.estadoNovo ?? params.estado;
      const utilizadorId = params.utilizadorId;
      const motivo = params.motivo;
      let estadoAnterior = params.estadoAnterior ?? null;

      if (!ordemId || !estadoNovo) {
        throw erros.transicaoInvalida(estadoAnterior ?? null);
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (!estadoAnterior) {
          const { rows: atual } = await client.query(
            `SELECT estado
             FROM ordens_servico
             WHERE id = $1::bigint
             FOR UPDATE`,
            [ordemId],
          );

          if (!atual[0]) {
            await client.query('ROLLBACK');
            return null;
          }

          estadoAnterior = atual[0].estado;
        }

        const { rows } = await client.query(
          `UPDATE ordens_servico
           SET estado = $2::text,
               data_conclusao = CASE
                 WHEN $2::text = 'CONCLUIDA' THEN now()
                 ELSE data_conclusao
               END,
               updated_at = now()
           WHERE id = $1::bigint
             AND estado = $3::text
           RETURNING ${RETURNING_COLS}`,
          [ordemId, estadoNovo, estadoAnterior],
        );

        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }

        await client.query(
          `INSERT INTO historico_estado (
             ordem_id,
             estado_anterior,
             estado_novo,
             utilizador_id,
             motivo
           )
           VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
          [ordemId, estadoAnterior, estadoNovo, utilizadorId ?? null, motivo ?? null],
        );

        await client.query('COMMIT');

        return map(rows[0]);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    // Alias usado por vários use-cases F12.
    async atualizarEstado({ ordemId, estado, utilizadorId, motivo }) {
      return this.transitar({
        id: ordemId,
        estado,
        utilizadorId,
        motivo,
      });
    },
  };
}