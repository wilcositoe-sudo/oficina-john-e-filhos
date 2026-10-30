import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  ordemId: r.ordem_id,
  remetenteId: r.remetente_id,
  remetenteNome: r.remetente_nome,
  remetentePerfil: r.remetente_perfil,
  conteudo: r.conteudo,
  enviadoAt: r.enviado_at,
});

export function criarPgMensagemRepository() {
  return {
    async criar({ ordemId, remetenteId, conteudo }) {
      const { rows } = await pool.query(
        `INSERT INTO mensagens (ordem_id, remetente_id, conteudo)
         VALUES ($1::bigint, $2::bigint, $3::text)
         RETURNING id, ordem_id, remetente_id, conteudo, enviado_at`,
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
        conteudo: rows[0].conteudo,
        enviadoAt: rows[0].enviado_at,
      };
    },

    async listarPorOrdem(ordemId) {
      const { rows } = await pool.query(
        `SELECT m.id, m.ordem_id, m.remetente_id, m.conteudo, m.enviado_at,
                u.nome AS remetente_nome, u.perfil AS remetente_perfil
         FROM mensagens m
         JOIN utilizadores u ON u.id = m.remetente_id
         WHERE m.ordem_id = $1::bigint
         ORDER BY m.enviado_at ASC, m.id ASC`,
        [ordemId],
      );
      return rows.map(map);
    },
  };
}