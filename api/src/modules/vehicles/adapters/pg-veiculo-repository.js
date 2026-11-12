import { pool } from '../../../shared/db/pool.js';

const SELECT_BASE = `
  SELECT v.id, v.cliente_id, v.matricula, v.marca, v.modelo, v.ano, u.id AS utilizador_id
  FROM veiculos v
  JOIN clientes c ON c.id = v.cliente_id
  JOIN utilizadores u ON u.id = c.utilizador_id`;

const map = (r) => ({
  id: r.id,
  clienteId: r.cliente_id,
  utilizadorId: r.utilizador_id,
  matricula: r.matricula,
  marca: r.marca,
  modelo: r.modelo,
  ano: r.ano,
});

export function criarPgVeiculoRepository() {
  return {
    async criar({ utilizadorId, matricula, marca, modelo, ano }) {
      const { rows } = await pool.query(
        `INSERT INTO veiculos (cliente_id, matricula, marca, modelo, ano)
         SELECT c.id, $2, $3, $4, $5 FROM clientes c WHERE c.utilizador_id = $1
         RETURNING id, cliente_id, matricula, marca, modelo, ano, $1::bigint AS utilizador_id`,
        [utilizadorId, matricula, marca, modelo, ano],
      );
      return map(rows[0]);
    },

    async procurarPorMatricula(matricula) {
      const { rows } = await pool.query(`${SELECT_BASE} WHERE v.matricula = $1`, [matricula]);
      return rows[0] ? map(rows[0]) : null;
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(`${SELECT_BASE} WHERE v.id = $1`, [id]);
      return rows[0] ? map(rows[0]) : null;
    },

    async atualizar(dados) {
      const { id, utilizadorId, matricula, marca, modelo, ano } = dados;
      const values = [id, utilizadorId];
      const updates = [];
      const fields = [
        ['matricula', matricula],
        ['marca', marca],
        ['modelo', modelo],
        ['ano', ano],
      ];

      for (const [column, value] of fields) {
        if (!Object.hasOwn(dados, column)) continue;
        values.push(value);
        updates.push(`${column} = $${values.length}`);
      }

      if (updates.length === 0) return this.procurarPorId(id);
      const { rows } = await pool.query(
        `UPDATE veiculos v
         SET ${updates.join(', ')}, updated_at = now()
         FROM clientes c
         WHERE v.id = $1
           AND c.id = v.cliente_id
           AND c.utilizador_id = $2
         RETURNING v.id, v.cliente_id, v.matricula, v.marca, v.modelo, v.ano, $2::bigint AS utilizador_id`,
        values,
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async listarPorUtilizador(utilizadorId) {
      const { rows } = await pool.query(
        `${SELECT_BASE} WHERE u.id = $1 ORDER BY v.created_at DESC`,
        [utilizadorId],
      );
      return rows.map(map);
    },
  };
}