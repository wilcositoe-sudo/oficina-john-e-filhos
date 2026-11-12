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
  o.endereco_entrega,
  o.entrega_lat,
  o.entrega_lng,
  o.taxa_diagnostico,
  o.diagnostico_cobrado,
  o.data_conclusao,
  o.created_at,
  u.id AS utilizador_id`;

const SELECT_BASE = `
  SELECT ${SELECT_COLS}
  FROM ordens_servico o
  JOIN clientes c ON c.id = o.cliente_id
  JOIN utilizadores u ON c.utilizador_id = u.id`;

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
  enderecoEntrega: r.endereco_entrega ?? null,
  entregaLat: r.entrega_lat ?? null,
  entregaLng: r.entrega_lng ?? null,
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

const RETURNING_COLS = `
  id, numero_os, cliente_id, veiculo_id, mecanico_id, estado, descricao_problema,
  valor_total, taxa_entrega, modalidade_entrega, taxa_diagnostico, diagnostico_cobrado,
  endereco_entrega, entrega_lat, entrega_lng, data_conclusao, created_at, ${SQL_PROPRIETARIO}`;

const ROTULOS_ESTADO_CHAT = {
  PENDENTE: 'Pendente',
  AGUARDANDO_DIAGNOSTICO: 'A aguardar diagnóstico',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'A aguardar orçamento',
  AGUARDANDO_APROVACAO_CLIENTE: 'A aguardar aprovação do cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'A aguardar validação',
  AGUARDANDO_ATRIBUICAO_REPARACAO: 'A aguardar atribuição para reparação',
  AGUARDANDO_REPARACAO: 'A aguardar reparação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'A aguardar peças',
  CONCLUIDA: 'Reparação concluída',
  PAGA: 'Pagamento confirmado',
  ENTREGUE: 'Veículo entregue',
  REJEITADA: 'Orçamento rejeitado',
  CANCELADA: 'Cancelada',
};

async function inserirMensagemEstado(client, { ordemId, numeroOS, estadoAnterior, estadoNovo }) {
  const anterior = estadoAnterior
    ? ROTULOS_ESTADO_CHAT[estadoAnterior] ?? estadoAnterior
    : null;
  const novo = ROTULOS_ESTADO_CHAT[estadoNovo] ?? estadoNovo;
  const mudanca = anterior ? `: ${anterior} → ${novo}` : `: ${novo}`;

  await client.query(
    `INSERT INTO mensagens (ordem_id, remetente_id, conteudo, tipo)
     VALUES ($1::bigint, NULL, $2::text, 'SISTEMA')`,
    [ordemId, `Atualização da OS ${numeroOS}${mudanca}.`],
  );
}

// ============================================================
// P1 — Planeamento de notificações por transição (best-effort)
// ============================================================
// Este bloco devolve sempre o shape esperado por _notificarBestEffort:
// { destinatarioPerfil, destinatarioId, titulo, corpo, ordemId, tipo }
function _planosNotificacao(estadoNovo, os) {
  if (!os || !estadoNovo) return [];

  const ordemId = os.id;
  const numero = os.numeroOS ?? os.numero_os ?? `#${ordemId}`;

  const clienteId = os.clienteId ?? os.cliente_id ?? null;
  const clienteUtilizadorId = os.utilizadorId ?? os.utilizador_id ?? null;
  const mecanicoId = os.mecanicoId ?? os.mecanico_id ?? null;

  const taxaDiagnosticoRaw = Number(os.taxaDiagnostico ?? os.taxa_diagnostico ?? 0);
  const taxaDiagnostico = Number.isFinite(taxaDiagnosticoRaw) ? taxaDiagnosticoRaw : 0;

  const plano = (destinatarioPerfil, destinatarioId, titulo, corpo) => ({
    destinatarioPerfil,
    destinatarioId: destinatarioId ?? null,
    titulo,
    corpo,
    ordemId,
    tipo: 'OS',
  });

  const planos = [];

  switch (estadoNovo) {
    case 'PENDENTE':
      break;

    case 'AGUARDANDO_DIAGNOSTICO':
      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'Nova OS atribuída',
            `A OS ${numero} está à espera que inicies o diagnóstico técnico.`,
          ),
        );
      }

      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Veículo encaminhado para mecânico',
            `A OS ${numero} foi atribuída a um mecânico para diagnóstico.`,
          ),
        );
      }
      break;

    case 'EM_DIAGNOSTICO':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Veículo em diagnóstico',
            `A OS ${numero} entrou em diagnóstico técnico.`,
          ),
        );
      }

      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'Diagnóstico iniciado',
            `A OS ${numero} está em diagnóstico técnico.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_PRECO_FUNCIONARIO':
      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'Diagnóstico concluído',
          `A OS ${numero} aguarda a tua precificação.`,
        ),
      );

      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'Diagnóstico submetido',
            `A OS ${numero} foi enviada para precificação.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_APROVACAO_CLIENTE':
    case 'AGUARDANDO_APROVACAO_ORCAMENTO':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Orçamento disponível',
            `O orçamento da OS ${numero} está pronto para aprovação.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_VALIDACAO_FUNCIONARIO':
      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'Cliente pediu revisão',
          `O cliente removeu itens na OS ${numero}. Valida os cortes.`,
        ),
      );

      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Edição enviada',
            `A revisão da OS ${numero} foi enviada ao funcionário.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_ATRIBUICAO_REPARACAO':
      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'Orçamento aprovado pelo cliente',
          `A OS ${numero} foi aprovada pelo cliente e aguarda atribuição de mecânico de reparação.`,
        ),
      );

      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Orçamento aprovado',
            `A OS ${numero} foi aprovada. A oficina vai atribuir o mecânico de reparação.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_REPARACAO':
      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'OS atribuída para reparação',
            `A OS ${numero} foi atribuída a ti para reparação. Inicia quando estiveres disponível.`,
          ),
        );
      }

      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Reparação atribuída',
            `A OS ${numero} foi atribuída a um mecânico para reparação.`,
          ),
        );
      }
      break;

    case 'EM_REPARACAO':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Reparação iniciada',
            `A reparação da OS ${numero} começou.`,
          ),
        );
      }

      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'Podes começar a reparação',
            `O cliente aprovou a OS ${numero}.`,
          ),
        );
      }
      break;

    case 'AGUARDANDO_PECAS':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'A aguardar peças',
            `A OS ${numero} está a aguardar peças.`,
          ),
        );
      }

      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'OS aguarda peças',
            `A OS ${numero} está a aguardar peças.`,
          ),
        );
      }

      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'OS aguarda peças',
          `A OS ${numero} está a aguardar peças.`,
        ),
      );
      break;

    case 'CONCLUIDA':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Carro pronto',
            `A OS ${numero} foi concluída. Escolhe a modalidade de entrega e realiza o pagamento (presencial, MPesa, M-Kesh ou Mola).`,
          ),
        );
      }

      if (mecanicoId) {
        planos.push(
          plano(
            'MECANICO',
            mecanicoId,
            'Reparação concluída',
            `A OS ${numero} foi marcada como concluída.`,
          ),
        );
      }
      break;

    case 'PAGA':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Pagamento confirmado',
            `O pagamento da OS ${numero} foi confirmado.`,
          ),
        );
      }

      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'Pagamento confirmado',
          `A OS ${numero} foi paga.`,
        ),
      );
      break;

    case 'ENTREGUE':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Veículo entregue',
            `A OS ${numero} foi entregue. Obrigado!`,
          ),
        );
      }
      break;

    case 'REJEITADA':
      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'Orçamento rejeitado',
          `Cliente rejeitou a OS ${numero}.`,
        ),
      );

      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'Orçamento rejeitado',
            taxaDiagnostico > 0
              ? `Foi cobrada a taxa de diagnóstico da OS ${numero}: ${taxaDiagnostico.toFixed(2)} MZN.`
              : `A OS ${numero} foi rejeitada.`,
          ),
        );
      }
      break;

    case 'CANCELADA':
      if (clienteUtilizadorId) {
        planos.push(
          plano(
            'CLIENTE',
            clienteUtilizadorId,
            'OS cancelada',
            `A OS ${numero} foi cancelada.`,
          ),
        );
      }

      planos.push(
        plano(
          'FUNCIONARIO',
          null,
          'OS cancelada',
          `A OS ${numero} foi cancelada.`,
        ),
      );
      break;

    default:
      break;
  }

  return planos;
}
async function _notificarBestEffort(payload) {
  if (!payload) return;

  try {
    await pool.query(
      `INSERT INTO notificacoes
         (destinatario_perfil, destinatario_id, titulo, corpo, ordem_id, tipo)
       VALUES ($1::text, $2::bigint, $3::text, $4::text, $5::bigint, $6::text)`,
      [
        payload.destinatarioPerfil ?? null,
        payload.destinatarioId ?? null,
        payload.titulo ?? '',
        payload.corpo ?? null,
        payload.ordemId ?? null,
        payload.tipo ?? 'OS',
      ],
    );
  } catch (e) {
    // Best-effort: falha de notificação NUNCA rebenta a operação principal.
    // eslint-disable-next-line no-console
    console.error('[notificacao] falha ao criar:', e.message);
  }
}

export function criarPgOsRepository() {
  return {
    // ============================================================
    // F12 — Atribuição ao Mecânico
    // ============================================================
    async atribuirMecanico({
      ordemId,
      mecanicoId,
      estadoAnterior,
      estadoNovo,
      utilizadorId,
      motivo,
    }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE ordens_servico
           SET mecanico_id = $2::bigint,
               estado = $3::text,
               updated_at = now()
           WHERE id = $1::bigint
             AND estado = $4::text
           RETURNING ${RETURNING_COLS}`,
          [ordemId, mecanicoId, estadoNovo, estadoAnterior],
        );

        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }

        await client.query(
          `INSERT INTO historico_estado (
             ordem_id, estado_anterior, estado_novo, utilizador_id, motivo
           )
           VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
          [ordemId, estadoAnterior, estadoNovo, utilizadorId ?? null, motivo ?? null],
        );
        await client.query('COMMIT');

        const osMap = map(rows[0]);
        for (const plano of _planosNotificacao(estadoNovo, osMap)) {
          await _notificarBestEffort(plano);
        }
        return osMap;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
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
    // Fase 5 — Edição do cliente: marcar/remover pendências
    // ============================================================
    async marcarItensParaRemocao({ ordemId, itensRemover }) {
      for (const item of (itensRemover ?? [])) {
        const linhaId = Number(item?.linhaId);

        if (!Number.isFinite(linhaId)) continue;

        if (item?.tipo === 'servico') {
          await pool.query(
            `UPDATE servicos_os
             SET pendente_remocao = TRUE
             WHERE id = $1::bigint
               AND ordem_id = $2::bigint`,
            [linhaId, ordemId],
          );
        }

        if (item?.tipo === 'peca') {
          await pool.query(
            `UPDATE pecas_os
             SET pendente_remocao = TRUE
             WHERE id = $1::bigint
               AND ordem_id = $2::bigint`,
            [linhaId, ordemId],
          );
        }
      }
    },

    async rejeitarRemocoesPendentes(ordemId) {
      await pool.query(
        `UPDATE servicos_os
         SET pendente_remocao = FALSE
         WHERE ordem_id = $1::bigint
           AND pendente_remocao = TRUE`,
        [ordemId],
      );

      await pool.query(
        `UPDATE pecas_os
         SET pendente_remocao = FALSE
         WHERE ordem_id = $1::bigint
           AND pendente_remocao = TRUE`,
        [ordemId],
      );
    },

    async aplicarRemocoesPendentes(ordemId) {
      await pool.query(
        `DELETE FROM servicos_os
         WHERE ordem_id = $1::bigint
           AND pendente_remocao = TRUE`,
        [ordemId],
      );

      await pool.query(
        `DELETE FROM pecas_os
         WHERE ordem_id = $1::bigint
           AND pendente_remocao = TRUE`,
        [ordemId],
      );
    },

    // ============================================================
    // F12 — Diagnóstico (Mecânico lança SEM preço)
    // ============================================================
    async lancarServicoSemPreco({
      ordemId,
      servicoId,
      quantidade,
      descricaoSnapshot,
      origem = 'CATALOGO',
    }) {
      await pool.query(
        `INSERT INTO servicos_os (
           ordem_id,
           servico_id,
           descricao_snapshot,
           quantidade,
           preco_unitario,
           subtotal,
           precificado,
           origem
         )
         VALUES (
           $1::bigint,
           $2::bigint,
           $3::text,
           $4::numeric,
           0,
           0,
           FALSE,
           $5::text
         )`,
        [
          ordemId,
          servicoId ?? null,
          descricaoSnapshot,
          quantidade,
          origem,
        ],
      );
    },

    async lancarPecaSemPreco({
      ordemId,
      pecaId,
      quantidade,
      descricaoSnapshot,
      origem = 'CATALOGO',
    }) {
      await pool.query(
        `INSERT INTO pecas_os (
           ordem_id,
           peca_id,
           descricao_snapshot,
           quantidade,
           preco_unitario,
           subtotal,
           precificado,
           origem
         )
         VALUES (
           $1::bigint,
           $2::bigint,
           $3::text,
           $4::integer,
           0,
           0,
           FALSE,
           $5::text
         )`,
        [
          ordemId,
          pecaId ?? null,
          descricaoSnapshot ?? null,
          quantidade,
          origem,
        ],
      );
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
    async removerLinhaServico({ linhaId }) {
      const { rowCount } = await pool.query(
        `DELETE FROM servicos_os WHERE id = $1::bigint`,
        [linhaId],
      );
      return rowCount > 0;
    },

    async removerLinhaPeca({ linhaId }) {
      const { rowCount } = await pool.query(
        `DELETE FROM pecas_os WHERE id = $1::bigint`,
        [linhaId],
      );
      return rowCount > 0;
    },

    async rejeitarComCobrancaDiagnostico({ ordemId, estadoAnterior, utilizadorId }) {
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

        if (
          !atual[0] ||
          atual[0].estado !== estadoAnterior ||
          atual[0].diagnostico_cobrado
        ) {
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
             AND estado = $2::text
             AND diagnostico_cobrado = FALSE
           RETURNING ${RETURNING_COLS}`,
          [ordemId, estadoAnterior],
        );

        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }

        if (utilizadorId) {
          await client.query(
            `INSERT INTO historico_estado (
               ordem_id, estado_anterior, estado_novo, utilizador_id, motivo
             )
             VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
            [
              ordemId,
              atual[0].estado,
              'REJEITADA',
              utilizadorId,
              'Cliente rejeitou o orçamento',
            ],
          );
        }

        await inserirMensagemEstado(client, {
          ordemId,
          numeroOS: rows[0].numero_os,
          estadoAnterior: atual[0].estado,
          estadoNovo: 'REJEITADA',
        });

        await client.query('COMMIT');

        const osMap = map(rows[0]);

        for (const plano of _planosNotificacao('REJEITADA', osMap)) {
          await _notificarBestEffort(plano);
        }

        return osMap;
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
             numero_os, cliente_id, veiculo_id, funcionario_id,
             orcamento_id, descricao_problema, estado
           )
           VALUES (
             'TMP-' || gen_random_uuid(),
             $1::bigint, $2::bigint, $3::bigint, $4::bigint, $5::text, 'PENDENTE'
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
             ordem_id, estado_anterior, estado_novo, utilizador_id
           )
           VALUES ($1::bigint, NULL, 'PENDENTE', $2::bigint)`,
          [id, funcionarioId],
        );

        await inserirMensagemEstado(client, {
          ordemId: id,
          numeroOS: upd[0].numero_os,
          estadoNovo: 'PENDENTE',
        });

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
             ordem_id, servico_id, descricao_snapshot, quantidade,
             preco_unitario, subtotal
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
            `SELECT ativo, quantidade_stock FROM pecas WHERE id = $1::bigint`,
            [pecaId],
          );

          if (!existe[0]) throw erros.pecaNaoEncontrada();
          throw erros.stockInsuficiente();
        }

        const { rows: linha } = await client.query(
          `INSERT INTO pecas_os (
             ordem_id, peca_id, quantidade, preco_unitario, subtotal
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
        `SELECT
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
         ORDER BY id`,
        [ordemId],
      );

      const { rows: pecas } = await pool.query(
        `SELECT
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
         ORDER BY id`,
        [ordemId],
      );

      return { servicos, pecas };
    },

    // ============================================================
    // F12 — Checklist técnico do diagnóstico
    // ============================================================
    async guardarChecklist({ ordemId, mecanicoId, itens }) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `DELETE FROM diagnostico_checklist WHERE ordem_id = $1::bigint`,
          [ordemId],
        );

        for (const it of (itens ?? [])) {
          const item = String(it.item ?? '').trim();
          if (!item) continue;

          await client.query(
            `INSERT INTO diagnostico_checklist (
               ordem_id, mecanico_id, item, estado, observacao, valor_medicao, foto_url
             )
             VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, $6::text, $7::text)`,
            [
              ordemId,
              mecanicoId,
              item,
              it.estado ?? 'OK',
              it.observacao ?? null,
              it.valorMedicao ?? it.valor_medicao ?? null,
              it.fotoUrl ?? it.foto_url ?? null,
            ],
          );
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async submeterDiagnostico({
      ordemId,
      mecanicoId,
      checklist,
      servicos,
      pecas,
      estadoAnterior,
      estado,
      utilizadorId,
      motivo,
    }) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          `UPDATE ordens_servico
           SET estado = $2::text,
               updated_at = now()
           WHERE id = $1::bigint
             AND estado = $3::text
           RETURNING ${RETURNING_COLS}`,
          [ordemId, estado, estadoAnterior],
        );

        if (!rows[0]) {
          await client.query('ROLLBACK');
          return null;
        }

        if (checklist?.length > 0) {
          await client.query(
            'DELETE FROM diagnostico_checklist WHERE ordem_id = $1::bigint',
            [ordemId],
          );
          for (const item of checklist) {
            const nomeItem = String(item.item ?? '').trim();
            if (!nomeItem) continue;

            await client.query(
              `INSERT INTO diagnostico_checklist (
                 ordem_id, mecanico_id, item, estado, observacao, valor_medicao, foto_url
               )
               VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, $6::text, $7::text)`,
              [
                ordemId,
                mecanicoId,
                nomeItem,
                item.estado ?? 'OK',
                item.observacao ?? null,
                item.valorMedicao ?? item.valor_medicao ?? null,
                item.fotoUrl ?? item.foto_url ?? null,
              ],
            );
          }
        }

        for (const servico of servicos) {
          await client.query(
            `INSERT INTO servicos_os (
               ordem_id, servico_id, descricao_snapshot, quantidade, preco_unitario,
               subtotal, precificado, origem
             )
             VALUES ($1::bigint, $2::bigint, $3::text, $4::numeric, 0, 0, FALSE, $5::text)`,
            [
              ordemId,
              servico.servicoId ?? null,
              servico.descricaoSnapshot,
              servico.quantidade,
              servico.origem,
            ],
          );
        }

        for (const peca of pecas) {
          await client.query(
            `INSERT INTO pecas_os (
               ordem_id, peca_id, descricao_snapshot, quantidade, preco_unitario,
               subtotal, precificado, origem
             )
             VALUES ($1::bigint, $2::bigint, $3::text, $4::integer, 0, 0, FALSE, $5::text)`,
            [
              ordemId,
              peca.pecaId ?? null,
              peca.descricaoSnapshot ?? null,
              peca.quantidade,
              peca.origem,
            ],
          );
        }

        await client.query(
          `INSERT INTO historico_estado (
             ordem_id, estado_anterior, estado_novo, utilizador_id, motivo
           )
           VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
          [
            ordemId,
            estadoAnterior,
            estado,
            utilizadorId ?? null,
            motivo ?? null,
          ],
        );
        await inserirMensagemEstado(client, {
          ordemId,
          numeroOS: rows[0].numero_os,
          estadoAnterior,
          estadoNovo: estado,
        });
        await client.query('COMMIT');

        const osMap = map(rows[0]);
        for (const plano of _planosNotificacao(estado, osMap)) {
          await _notificarBestEffort(plano);
        }
        return osMap;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async listarChecklist(ordemId) {
      const { rows } = await pool.query(
        `SELECT
           id,
           ordem_id,
           mecanico_id,
           item,
           estado,
           observacao,
           valor_medicao,
           foto_url,
           criado_at
         FROM diagnostico_checklist
         WHERE ordem_id = $1::bigint
         ORDER BY id ASC`,
        [ordemId],
      );

      return rows.map((r) => ({
        id: r.id,
        ordemId: r.ordem_id,
        mecanicoId: r.mecanico_id,
        item: r.item,
        estado: r.estado,
        observacao: r.observacao,
        valorMedicao: r.valor_medicao,
        fotoUrl: r.foto_url,
        criadoAt: r.criado_at,
      }));
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
    async definirEntrega({
      ordemId,
      estadoEsperado,
      modalidade,
      taxaEntrega,
      enderecoEntrega,
      entregaLat,
      entregaLng,
    }) {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const { rowCount } = await client.query(
          `UPDATE ordens_servico
           SET modalidade_entrega = $2::text,
               taxa_entrega = $3::numeric,
               endereco_entrega = $5::text,
               entrega_lat = $6::double precision,
               entrega_lng = $7::double precision,
               updated_at = now()
           WHERE id = $1::bigint
             AND estado = $4::text`,
          [ordemId, modalidade, taxaEntrega, estadoEsperado, enderecoEntrega, entregaLat, entregaLng],
        );
        if (rowCount === 0) {
          await client.query('ROLLBACK');
          return null;
        }

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
    async transitar(params) {
      const ordemId = params.ordemId ?? params.id;
      const estadoNovo = params.estadoNovo ?? params.estado;
      const utilizadorId = params.utilizadorId;
      const motivo = params.motivo;
      let estadoAnterior = params.estadoAnterior ?? null;

      if (!ordemId || !estadoNovo) {
        throw erros.transicaoInvalida(estadoAnterior ?? null);
      }
      if (!estadoAnterior) {
        throw new Error('estadoAnterior obrigatório para transitar a OS.');
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

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
             ordem_id, estado_anterior, estado_novo, utilizador_id, motivo
           )
           VALUES ($1::bigint, $2::text, $3::text, $4::bigint, $5::text)`,
          [
            ordemId,
            estadoAnterior,
            estadoNovo,
            utilizadorId ?? null,
            motivo ?? null,
          ],
        );

        await inserirMensagemEstado(client, {
          ordemId,
          numeroOS: rows[0].numero_os,
          estadoAnterior,
          estadoNovo,
        });

        await client.query('COMMIT');

        const osMap = map(rows[0]);

        for (const plano of _planosNotificacao(estadoNovo, osMap)) {
          await _notificarBestEffort(plano);
        }

        return osMap;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },

    async atualizarEstado({ ordemId, estadoAnterior, estado, utilizadorId, motivo }) {
      if (!estadoAnterior) {
        throw new Error('estadoAnterior obrigatório para atualizar o estado da OS.');
      }
      return this.transitar({
        ordemId,
        estadoAnterior,
        estadoNovo: estado,
        utilizadorId,
        motivo,
      });
    },
  };
}