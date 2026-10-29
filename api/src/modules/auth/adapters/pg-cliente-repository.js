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
  };
}