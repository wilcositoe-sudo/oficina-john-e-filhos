import { pool } from '../../../shared/db/pool.js';

export function criarPgClienteRepository() {
  return {
    async criar({ utilizadorId }) {
      const { rows } = await pool.query(
        'INSERT INTO clientes (utilizador_id) VALUES ($1) RETURNING id',
        [utilizadorId],
      );
      return { id: rows[0].id };
    },

    async procurarPorUtilizadorId(utilizadorId) {
      const { rows } = await pool.query(
        'SELECT id, utilizador_id, endereco, created_at FROM clientes WHERE utilizador_id = $1',
        [utilizadorId],
      );
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        utilizadorId: rows[0].utilizador_id,
        endereco: rows[0].endereco,
        createdAt: rows[0].created_at,
      };
    },
  };
}