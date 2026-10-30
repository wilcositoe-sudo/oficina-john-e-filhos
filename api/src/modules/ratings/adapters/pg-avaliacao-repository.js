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
        // Corrida: duas avaliações simultâneas da mesma OS → unique(ordem_id)
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
         ORDER BY a.created_at DESC
         LIMIT 50`,
      );
      return rows.map((r) => ({
        id: r.id,
        classificacao: r.classificacao,
        comentario: r.comentario,
        clienteNome: r.cliente_nome, // primeiro nome apenas (RF09 — sem dados privados)
        createdAt: r.created_at,
      }));
    },
  };
}