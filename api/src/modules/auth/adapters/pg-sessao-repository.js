import { pool } from '../../../shared/db/pool.js';

export function criarPgSessaoRepository() {
  return {
    async criar({ token, utilizadorId, expiraAt }) {
      await pool.query(
        `INSERT INTO sessoes (token, utilizador_id, expira_at) VALUES ($1, $2, $3)`,
        [token, utilizadorId, expiraAt],
      );
    },

    async procurarAtiva(token) {
      const { rows } = await pool.query(
        `SELECT token, utilizador_id FROM sessoes
         WHERE token = $1 AND revogada = FALSE AND expira_at > now()`,
        [token],
      );
      return rows[0] ?? null;
    },

    async revogar(token) {
      await pool.query('UPDATE sessoes SET revogada = TRUE WHERE token = $1', [token]);
    },
  };
}