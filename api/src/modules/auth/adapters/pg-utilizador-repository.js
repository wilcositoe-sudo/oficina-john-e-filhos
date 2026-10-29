import { pool } from '../../../shared/db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    perfil: row.perfil,
    ativo: row.ativo,
    createdAt: row.created_at,
  };
}

export function criarPgUtilizadorRepository() {
  return {
    async criar({ nome, email, telefone, passwordHash, perfil }) {
      const { rows } = await pool.query(
        `INSERT INTO utilizadores (nome, email, telefone, password_hash, perfil)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email, telefone, perfil, ativo, created_at`,
        [nome, email, telefone, passwordHash, perfil],
      );
      return mapRow(rows[0]);
    },

    async procurarPorEmail(email) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at, password_hash
         FROM utilizadores WHERE lower(trim(email)) = lower(trim($1))`,
        [email],
      );
      return rows[0] ?? null;
    },

    async procurarPorTelefone(telefone) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at, password_hash
         FROM utilizadores WHERE telefone = $1`,
        [telefone],
      );
      return rows[0] ?? null;
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at
         FROM utilizadores WHERE id = $1`,
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },
  };
}