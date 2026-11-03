import { pool } from '../../../shared/db/pool.js';
import { erros } from '../../../shared/errors/domain-error.js';

export function criarPgAvaliacaoRepository() {
  return {
    async criar({ ordemId, clienteId, classificacao, comentario }) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO avaliacoes (ordem_id, cliente_id, classificacao, comentario, publicada)
           VALUES ($1::bigint, $2::bigint, $3::int, $4::text, TRUE)
           RETURNING id, ordem_id, classificacao, comentario, publicada, created_at`,
          [ordemId, clienteId, classificacao, comentario],
        );
        return rows[0];
      } catch (err) {
        if (err.code === '23505') throw erros.avaliacaoExistente();
        throw err;
      }
    },
    async procurarPorOrdem(ordemId) {
      const { rows } = await pool.query(
        'SELECT id, ordem_id, classificacao, comentario, publicada, created_at FROM avaliacoes WHERE ordem_id = $1::bigint',
        [ordemId],
      );
      return rows[0] ?? null;
    },
    async listarPublicas() {
      const { rows } = await pool.query(
        `SELECT a.id, a.classificacao, a.comentario, a.created_at,
                split_part(u.nome, ' ', 1) AS cliente_nome
         FROM avaliacoes a
         JOIN clientes c ON c.id = a.cliente_id
         JOIN utilizadores u ON u.id = c.utilizador_id
         WHERE a.publicada = TRUE
         ORDER BY a.created_at DESC LIMIT 50`,
      );
      return rows.map((r) => ({
        id: r.id,
        classificacao: r.classificacao,
        comentario: r.comentario,
        clienteNome: r.cliente_nome,
        createdAt: r.created_at,
        publicada: r.publicada,
      }));
    },
    // NOVO
    async listarTodas() {
      const { rows } = await pool.query(
        `SELECT a.id, a.classificacao, a.comentario, a.created_at, a.publicada,
                u.nome AS cliente_nome_completo
         FROM avaliacoes a
         JOIN clientes c ON c.id = a.cliente_id
         JOIN utilizadores u ON u.id = c.utilizador_id
         ORDER BY a.created_at DESC`,
      );
      return rows.map((r) => ({
        id: r.id,
        classificacao: r.classificacao,
        comentario: r.comentario,
        clienteNome: r.cliente_nome_completo,
        createdAt: r.created_at,
        publicada: r.publicada,
      }));
    },
    // NOVO
    async atualizarPublicacao({ id, publicada }) {
      const { rows } = await pool.query(
        `UPDATE avaliacoes SET publicada = $2, updated_at = now()
         WHERE id = $1::bigint RETURNING id, publicada`,
        [id, publicada],
      );
      return rows[0] ?? null;
    },
  };
}