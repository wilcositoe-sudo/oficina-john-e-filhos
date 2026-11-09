import { pool } from '../../../shared/db/pool.js';

const SELECT_CONVERSA = `
  id,
  utilizador_id,
  cliente_id,
  veiculo_id,
  status,
  etapa,
  nome_cliente,
  email,
  telefone,
  problema,
  orcamento_estimado,
  agendado_at,

  quer_diagnostico,
  expira_em,

  modalidade_entrega,
  taxa_entrega,

  chegada_modalidade,
  chegada_bairro,
  chegada_quarteirao,
  chegada_numero_casa,
  chegada_ponto_referencia,

  chegada_lat,
  chegada_lng,
  chegada_precisao_m,

  chegada_distancia_km,
  chegada_tempo_min,
  chegada_taxa,
  chegada_consentimento_at,

  atendido_por,
  os_id,
  nao_lidas_staff,
  nao_lidas_cliente,
  ultima_mensagem_at,
  criado_at,
  atualizado_at`;

const mapConversa = (r) => ({
  id: r.id,
  utilizadorId: r.utilizador_id,
  clienteId: r.cliente_id,
  veiculoId: r.veiculo_id,
  status: r.status,
  etapa: r.etapa,
  nomeCliente: r.nome_cliente,
  email: r.email,
  telefone: r.telefone,
  problema: r.problema,
  orcamentoEstimado: r.orcamento_estimado,
  agendadoAt: r.agendado_at,

  querDiagnostico: r.quer_diagnostico,
  expiraEm: r.expira_em,

  modalidadeEntrega: r.modalidade_entrega,
  taxaEntrega: r.taxa_entrega,

  chegadaModalidade: r.chegada_modalidade,
  chegadaBairro: r.chegada_bairro,
  chegadaQuarteirao: r.chegada_quarteirao,
  chegadaNumeroCasa: r.chegada_numero_casa,
  chegadaPontoReferencia: r.chegada_ponto_referencia,

  chegadaLat: r.chegada_lat,
  chegadaLng: r.chegada_lng,
  chegadaPrecisaoM: r.chegada_precisao_m,

  chegadaDistanciaKm: r.chegada_distancia_km,
  chegadaTempoMin: r.chegada_tempo_min,
  chegadaTaxa: r.chegada_taxa,
  chegadaConsentimentoAt: r.chegada_consentimento_at,

  atendidoPor: r.atendido_por,
  osId: r.os_id,
  naoLidasStaff: r.nao_lidas_staff,
  naoLidasCliente: r.nao_lidas_cliente,
  ultimaMensagemAt: r.ultima_mensagem_at,
  criadoAt: r.criado_at,
  atualizadoAt: r.atualizado_at,
});

const mapMensagem = (r) => ({
  id: r.id,
  conversaId: r.conversa_id,
  remetente: r.remetente,
  remetenteId: r.remetente_id,
  conteudo: r.conteudo,
  metadata: r.metadata ?? null,
  criadoAt: r.criado_at,
});

const CAMPOS_ATUALIZAVEL = {
  etapa: 'etapa',
  status: 'status',
  veiculoId: 'veiculo_id',
  problema: 'problema',
  orcamentoEstimado: 'orcamento_estimado',
  agendadoAt: 'agendado_at',

  querDiagnostico: 'quer_diagnostico',
  expiraEm: 'expira_em',

  modalidadeEntrega: 'modalidade_entrega',
  taxaEntrega: 'taxa_entrega',

  chegadaModalidade: 'chegada_modalidade',
  chegadaBairro: 'chegada_bairro',
  chegadaQuarteirao: 'chegada_quarteirao',
  chegadaNumeroCasa: 'chegada_numero_casa',
  chegadaPontoReferencia: 'chegada_ponto_referencia',

  chegadaLat: 'chegada_lat',
  chegadaLng: 'chegada_lng',
  chegadaPrecisaoM: 'chegada_precisao_m',

  chegadaDistanciaKm: 'chegada_distancia_km',
  chegadaTempoMin: 'chegada_tempo_min',
  chegadaTaxa: 'chegada_taxa',
  chegadaConsentimentoAt: 'chegada_consentimento_at',

  atendidoPor: 'atendido_por',
  osId: 'os_id',
  clienteId: 'cliente_id',
  nomeCliente: 'nome_cliente',
  email: 'email',
  telefone: 'telefone',
};

export function criarPgChatbotRepository() {
  return {
    async obterClientePorUtilizador(utilizadorId) {
      const { rows } = await pool.query(
        `SELECT
           u.id AS utilizador_id,
           u.nome,
           u.email,
           u.telefone,
           c.id AS cliente_id
         FROM utilizadores u
         LEFT JOIN clientes c ON c.utilizador_id = u.id
         WHERE u.id = $1::bigint`,
        [utilizadorId],
      );
      return rows[0] ?? null;
    },

    async listarVeiculos(clienteId) {
      if (!clienteId) return [];

      const { rows } = await pool.query(
        `SELECT id, matricula, marca, modelo, ano
         FROM veiculos
         WHERE cliente_id = $1::bigint
         ORDER BY matricula ASC`,
        [clienteId],
      );

      return rows;
    },

    async listarServicos() {
      const { rows } = await pool.query(
        `SELECT id, nome, preco_base
         FROM servicos
         WHERE ativo = TRUE
         ORDER BY nome ASC`,
      );
      return rows;
    },

    async listarPecas() {
      const { rows } = await pool.query(
        `SELECT id, nome, preco_unitario, quantidade_stock
         FROM pecas
         WHERE ativo = TRUE AND quantidade_stock > 0
         ORDER BY nome ASC`,
      );
      return rows;
    },

    async garantirConversa({ utilizadorId, clienteId, nome, email, telefone }) {
      const { rows: existentes } = await pool.query(
        `SELECT ${SELECT_CONVERSA}
         FROM chat_conversas
         WHERE utilizador_id = $1::bigint
           AND status NOT IN ('FECHADA','CONVERTIDA')
         ORDER BY atualizado_at DESC
         LIMIT 1`,
        [utilizadorId],
      );

      if (existentes[0]) return mapConversa(existentes[0]);

      const { rows } = await pool.query(
        `INSERT INTO chat_conversas (
           utilizador_id,
           cliente_id,
           nome_cliente,
           email,
           telefone,
           status,
           etapa
         )
         VALUES ($1::bigint, $2::bigint, $3::text, $4::text, $5::text, 'BOT', 'INICIO')
         RETURNING ${SELECT_CONVERSA}`,
        [utilizadorId, clienteId ?? null, nome ?? null, email ?? null, telefone ?? null],
      );

      return mapConversa(rows[0]);
    },

    async obterConversa(id) {
      const { rows } = await pool.query(
        `SELECT ${SELECT_CONVERSA}
         FROM chat_conversas
         WHERE id = $1::bigint`,
        [id],
      );

      return rows[0] ? mapConversa(rows[0]) : null;
    },

    async listarConversasStaff() {
      const { rows } = await pool.query(
        `SELECT
           ${SELECT_CONVERSA},
           (
             SELECT conteudo
             FROM chat_mensagens m
             WHERE m.conversa_id = chat_conversas.id
             ORDER BY m.id DESC
             LIMIT 1
           ) AS ultima_mensagem_preview
         FROM chat_conversas
         WHERE status IN ('EM_ATENDIMENTO','AGUARDANDO_FUNCIONARIO')
         ORDER BY nao_lidas_staff DESC, ultima_mensagem_at DESC`,
      );

      return rows.map((r) => ({
        ...mapConversa(r),
        ultimaMensagemPreview: r.ultima_mensagem_preview,
      }));
    },

    async listarMensagens(conversaId) {
      const { rows } = await pool.query(
        `SELECT id, conversa_id, remetente, remetente_id, conteudo, metadata, criado_at
         FROM chat_mensagens
         WHERE conversa_id = $1::bigint
         ORDER BY id ASC`,
        [conversaId],
      );

      return rows.map(mapMensagem);
    },

    async criarMensagem({ conversaId, remetente, remetenteId, conteudo, metadata }) {
      const { rows } = await pool.query(
        `INSERT INTO chat_mensagens (
           conversa_id,
           remetente,
           remetente_id,
           conteudo,
           metadata
         )
         VALUES ($1::bigint, $2::text, $3::bigint, $4::text, $5::jsonb)
         RETURNING id, conversa_id, remetente, remetente_id, conteudo, metadata, criado_at`,
        [conversaId, remetente, remetenteId ?? null, conteudo, JSON.stringify(metadata ?? null)],
      );

      await pool.query(
        `UPDATE chat_conversas
         SET ultima_mensagem_at = now(),
             atualizado_at = now()
         WHERE id = $1::bigint`,
        [conversaId],
      );

      return mapMensagem(rows[0]);
    },

    async atualizarConversa({ id, ...dados }) {
      const sets = [];
      const vals = [];
      let i = 1;

      for (const [chave, valor] of Object.entries(dados)) {
        const coluna = CAMPOS_ATUALIZAVEL[chave];
        if (!coluna) continue;

        sets.push(`${coluna} = $${i++}`);
        vals.push(valor);
      }

      if (!sets.length) return this.obterConversa(id);

      sets.push('atualizado_at = now()');
      vals.push(id);

      const { rows } = await pool.query(
        `UPDATE chat_conversas
         SET ${sets.join(', ')}
         WHERE id = $${i}
         RETURNING ${SELECT_CONVERSA}`,
        vals,
      );

      return rows[0] ? mapConversa(rows[0]) : null;
    },

    async incrementarNaoLidasStaff(conversaId) {
      await pool.query(
        `UPDATE chat_conversas
         SET nao_lidas_staff = nao_lidas_staff + 1,
             ultima_mensagem_at = now(),
             atualizado_at = now()
         WHERE id = $1::bigint`,
        [conversaId],
      );
    },

    async zerarNaoLidasStaff(conversaId) {
      await pool.query(
        `UPDATE chat_conversas
         SET nao_lidas_staff = 0,
             atualizado_at = now()
         WHERE id = $1::bigint`,
        [conversaId],
      );
    },

    async incrementarNaoLidasCliente(conversaId) {
      await pool.query(
        `UPDATE chat_conversas
         SET nao_lidas_cliente = nao_lidas_cliente + 1,
             ultima_mensagem_at = now(),
             atualizado_at = now()
         WHERE id = $1::bigint`,
        [conversaId],
      );
    },

    async zerarNaoLidasCliente(conversaId) {
      await pool.query(
        `UPDATE chat_conversas
         SET nao_lidas_cliente = 0,
             atualizado_at = now()
         WHERE id = $1::bigint`,
        [conversaId],
      );
    },

    async apagarExpiradas() {
      const { rowCount } = await pool.query(`
        DELETE FROM chat_conversas
        WHERE expira_em IS NOT NULL
          AND expira_em < now()
          AND os_id IS NULL
          AND status <> 'CONVERTIDA'
      `);

      return rowCount;
    },

    async listarReservasEntre(inicio, fim) {
      const { rows } = await pool.query(
        `SELECT id, conversa_id, inicio_at, fim_at, estado
         FROM chat_reservas
         WHERE estado <> 'CANCELADO'
           AND inicio_at >= $1::timestamptz
           AND inicio_at < $2::timestamptz
         ORDER BY inicio_at ASC`,
        [inicio, fim],
      );

      return rows;
    },

    async criarReserva({ conversaId, inicioAt, fimAt }) {
      const { rows } = await pool.query(
        `INSERT INTO chat_reservas (
           conversa_id,
           inicio_at,
           fim_at,
           estado
         )
         VALUES ($1::bigint, $2::timestamptz, $3::timestamptz, 'RESERVADO')
         RETURNING id, conversa_id, inicio_at, fim_at, estado, criado_at`,
        [conversaId, inicioAt, fimAt],
      );

      return rows[0];
    },

    async cancelarReservasDaConversa(conversaId) {
      await pool.query(
        `UPDATE chat_reservas
         SET estado = 'CANCELADO'
         WHERE conversa_id = $1::bigint
           AND estado <> 'CANCELADO'`,
        [conversaId],
      );
    },
  };
}