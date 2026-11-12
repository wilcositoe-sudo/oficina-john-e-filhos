import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  ordemId: r.ordem_id,
  remetenteId: r.remetente_id,
  remetenteNome: r.tipo === 'SISTEMA' ? 'Oficina' : r.remetente_nome,
  remetentePerfil: r.tipo === 'SISTEMA' ? 'SISTEMA' : r.remetente_perfil,
  tipo: r.tipo ?? 'UTILIZADOR',
  conteudo: r.conteudo,
  enviadoAt: r.enviado_at,
});

export function criarPgMensagemRepository() {
  return {
    async criar({ ordemId, remetenteId, conteudo }) {
      const { rows } = await pool.query(
        `INSERT INTO mensagens (ordem_id, remetente_id, conteudo)
         VALUES ($1::bigint, $2::bigint, $3::text)
         RETURNING id, ordem_id, remetente_id, conteudo, enviado_at, tipo`,
        [ordemId, remetenteId, conteudo],
      );
      const { rows: remetente } = await pool.query(
        'SELECT nome, perfil FROM utilizadores WHERE id = $1::bigint',
        [remetenteId],
      );
      return {
        id: rows[0].id,
        ordemId: rows[0].ordem_id,
        remetenteId: rows[0].remetente_id,
        remetenteNome: remetente[0]?.nome ?? null,
        remetentePerfil: remetente[0]?.perfil ?? null,
        tipo: rows[0].tipo,
        conteudo: rows[0].conteudo,
        enviadoAt: rows[0].enviado_at,
      };
    },

    async listarPorOrdem(ordemId) {
      const { rows } = await pool.query(
        `SELECT m.id, m.ordem_id, m.remetente_id, m.conteudo, m.enviado_at,
                u.nome AS remetente_nome, u.perfil AS remetente_perfil, m.tipo
         FROM mensagens m
         LEFT JOIN utilizadores u ON u.id = m.remetente_id
         WHERE m.ordem_id = $1::bigint
         ORDER BY m.enviado_at ASC, m.id ASC`,
        [ordemId],
      );
      return rows.map(map);
    },

    async listarConversas({ utilizador }) {
      const { id, perfil } = utilizador;
      const condicao = perfil === 'CLIENTE'
        ? 'u.id = $1::bigint'
        : perfil === 'MECANICO'
          ? 'o.mecanico_id = $1::bigint'
          : 'TRUE';
      const { rows } = await pool.query(
        `SELECT
           o.id,
           o.numero_os,
           o.estado,
           o.updated_at,
           u.nome AS cliente_nome,
           ultima.conteudo AS ultima_mensagem_preview,
           ultima.enviado_at AS ultima_mensagem_at,
           COALESCE(nao_lidas.total, 0)::int AS nao_lidas
         FROM ordens_servico o
         JOIN clientes c ON c.id = o.cliente_id
         JOIN utilizadores u ON u.id = c.utilizador_id
         LEFT JOIN mensagens_os_leituras leitura
           ON leitura.ordem_id = o.id AND leitura.utilizador_id = $1::bigint
         LEFT JOIN LATERAL (
           SELECT m.conteudo, m.enviado_at
           FROM mensagens m
           WHERE m.ordem_id = o.id
           ORDER BY m.id DESC
           LIMIT 1
         ) ultima ON TRUE
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS total
           FROM mensagens m
           WHERE m.ordem_id = o.id
             AND m.id > COALESCE(leitura.ultima_mensagem_id, 0)
             AND m.remetente_id IS DISTINCT FROM $1::bigint
         ) nao_lidas ON TRUE
         WHERE ${condicao}
           AND NOT EXISTS (
             SELECT 1 FROM mensagens_os_ocultacoes ocultacao
             WHERE ocultacao.ordem_id = o.id
               AND ocultacao.utilizador_id = $1::bigint
           )
         ORDER BY COALESCE(ultima.enviado_at, o.updated_at, o.created_at) DESC, o.id DESC`,
        [id],
      );
      return rows.map((r) => ({
        id: r.id,
        tipo: 'OS',
        numeroOS: r.numero_os,
        estado: r.estado,
        nomeCliente: r.cliente_nome,
        preview: r.ultima_mensagem_preview ?? `Ordem ${r.numero_os} · ${r.estado}`,
        atualizadoAt: r.ultima_mensagem_at ?? r.updated_at,
        naoLidas: r.nao_lidas,
      }));
    },

    async marcarLidas({ ordemId, utilizadorId }) {
      await pool.query(
        `INSERT INTO mensagens_os_leituras (ordem_id, utilizador_id, ultima_mensagem_id)
         SELECT $1::bigint, $2::bigint, COALESCE(MAX(id), 0)
         FROM mensagens
         WHERE ordem_id = $1::bigint
         ON CONFLICT (ordem_id, utilizador_id)
         DO UPDATE SET
           ultima_mensagem_id = GREATEST(
             mensagens_os_leituras.ultima_mensagem_id,
             EXCLUDED.ultima_mensagem_id
           ),
           atualizado_at = now()
         WHERE mensagens_os_leituras.ultima_mensagem_id < EXCLUDED.ultima_mensagem_id`,
        [ordemId, utilizadorId],
      );
    },

    async ocultarConversa({ ordemId, utilizadorId }) {
      await pool.query(
        `INSERT INTO mensagens_os_ocultacoes (ordem_id, utilizador_id)
         VALUES ($1::bigint, $2::bigint)
         ON CONFLICT (ordem_id, utilizador_id)
         DO UPDATE SET ocultado_at = now()`,
        [ordemId, utilizadorId],
      );
    },
  };
}