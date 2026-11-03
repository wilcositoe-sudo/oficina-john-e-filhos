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
         VALUES ($1::text, $2::text, $3::text, $4::text, $5::text)
         RETURNING id, nome, email, telefone, perfil, ativo, created_at`,
        [nome, email, telefone, passwordHash, perfil],
      );
      return mapRow(rows[0]);
    },

    async procurarPorEmail(email) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at, password_hash
         FROM utilizadores WHERE lower(trim(email)) = lower(trim($1::text))`,
        [email],
      );
      return rows[0] ?? null;
    },

    async procurarPorTelefone(telefone) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at, password_hash
         FROM utilizadores WHERE telefone = $1::text`,
        [telefone],
      );
      return rows[0] ?? null;
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at
         FROM utilizadores WHERE id = $1::bigint`,
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    // --- F11: Gestão de contas internas ---
    async listarInternos() {
      const { rows } = await pool.query(
        `SELECT id, nome, email, telefone, perfil, ativo, created_at
         FROM utilizadores
        WHERE perfil IN ('FUNCIONARIO','ADMINISTRADOR','MECANICO')
         ORDER BY created_at ASC`,
      );
      return rows.map(mapRow);
    },

    async contarAdminsAtivos(excluirId = null) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM utilizadores
         WHERE perfil = 'ADMINISTRADOR' AND ativo = TRUE AND id <> COALESCE($1::bigint, -1)`,
        [excluirId],
      );
      return rows[0].n;
    },

    async atualizarContaInterna({ id, nome, ativo }) {
      const { rows } = await pool.query(
        `UPDATE utilizadores
         SET nome = COALESCE($2::text, nome),
             ativo = COALESCE($3::boolean, ativo),
             updated_at = now()
         WHERE id = $1::bigint
         RETURNING id, nome, email, telefone, perfil, ativo, created_at`,
        [id, nome ?? null, ativo ?? null],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    // --- F12: Recuperação de senha ---
    async guardarTokenRecuperacao(id, token, expiraEm) {
      await pool.query(
        `UPDATE utilizadores SET reset_token = $2, reset_token_expires_at = $3 WHERE id = $1::bigint`,
        [id, token, expiraEm],
      );
    },

    async procurarPorTokenRecuperacao(token) {
      const { rows } = await pool.query(
        `SELECT id, reset_token, reset_token_expires_at FROM utilizadores WHERE reset_token = $1 AND ativo = TRUE`,
        [token],
      );
      return rows[0] ?? null;
    },

    async atualizarSenhaEInvalidarToken(id, passwordHash) {
      await pool.query(
        `UPDATE utilizadores SET password_hash = $2, reset_token = NULL, reset_token_expires_at = NULL, updated_at = now() WHERE id = $1::bigint`,
        [id, passwordHash],
      );
    },
  };
}