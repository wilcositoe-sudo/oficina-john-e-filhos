import { pool } from '../../../shared/db/pool.js';

const SELECT_BASE = `
  SELECT a.id, a.inicio_at, a.fim_at, a.estado, a.created_at, u.id AS utilizador_id
  FROM agendamentos a
  JOIN clientes c ON c.id = a.cliente_id
  JOIN utilizadores u ON u.id = c.utilizador_id`;

const map = (r) => ({
  id: r.id,
  inicioAt: r.inicio_at,
  fimAt: r.fim_at,
  estado: r.estado,
  createdAt: r.created_at,
  utilizadorId: r.utilizador_id,
});

export function criarPgAgendamentoRepository() {
  return {
    async ocupadosNoDia(dataISO) {
      const { rows } = await pool.query(
        `SELECT inicio_at FROM agendamentos
         WHERE estado IN ('SOLICITADO','CONFIRMADO') AND inicio_at::date = $1::date`,
        [dataISO],
      );
      return new Set(rows.map((r) => new Date(r.inicio_at).toISOString()));
    },

    async criarCondicional({ utilizadorId, veiculoId, inicioAt, fimAt }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Serializa escritores que disputam o mesmo instante de início
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [inicioAt]);
        const { rows } = await client.query(
          `INSERT INTO agendamentos (cliente_id, veiculo_id, inicio_at, fim_at, estado, criado_por)
           SELECT c.id, $2, $3::timestamptz, $4::timestamptz, 'CONFIRMADO', $1
           FROM clientes c
           WHERE c.utilizador_id = $1
             AND NOT EXISTS (
               SELECT 1 FROM agendamentos a
               WHERE a.estado IN ('SOLICITADO','CONFIRMADO')
                 AND a.inicio_at < $4::timestamptz
                 AND a.fim_at > $3::timestamptz
             )
           RETURNING id, inicio_at, fim_at, estado, created_at, $1::bigint AS utilizador_id`,
          [utilizadorId, veiculoId, inicioAt, fimAt],
        );
        await client.query('COMMIT');
        return rows[0] ? map(rows[0]) : null;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(`${SELECT_BASE} WHERE a.id = $1`, [id]);
      return rows[0] ? map(rows[0]) : null;
    },

    async listarPorUtilizador(utilizadorId) {
      const { rows } = await pool.query(
        `${SELECT_BASE} WHERE u.id = $1 ORDER BY a.inicio_at DESC`,
        [utilizadorId],
      );
      return rows.map(map);
    },

    async listarTodos() {
      const { rows } = await pool.query(`${SELECT_BASE} ORDER BY a.inicio_at DESC`);
      return rows.map(map);
    },

    async cancelarCondicional(id) {
      const { rows } = await pool.query(
        `UPDATE agendamentos SET estado = 'CANCELADO'
         WHERE id = $1 AND estado IN ('SOLICITADO','CONFIRMADO') AND inicio_at > now()
         RETURNING id, inicio_at, fim_at, estado, created_at,
           (SELECT u.id FROM agendamentos a2 JOIN clientes c ON c.id = a2.cliente_id JOIN utilizadores u ON u.id = c.utilizador_id WHERE a2.id = $1) AS utilizador_id`,
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },
  };
}