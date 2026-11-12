import { pool } from '../../../shared/db/pool.js';

function mapRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    perfil: row.perfil,
    fotoPerfilUrl: row.foto_perfil_url,
    ativo: row.ativo,
    podeGerirCatalogo: row.pode_gerir_catalogo,
    createdAt: row.created_at,
  };
}

// Colunas padrão seleccionadas em todos os SELECT de utilizador interno.
const COLUNAS_UTILIZADOR = `
  id, nome, email, telefone, perfil, foto_perfil_url, ativo, pode_gerir_catalogo, created_at`;

export function criarPgUtilizadorRepository() {
  return {
    async criar({ nome, email, telefone, passwordHash, perfil }) {
      const { rows } = await pool.query(
        `INSERT INTO utilizadores (nome, email, telefone, password_hash, perfil, pode_gerir_catalogo)
         VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::boolean)
         RETURNING ${COLUNAS_UTILIZADOR}`,
        [
          nome,
          email,
          telefone,
          passwordHash,
          perfil,
          perfil === 'ADMINISTRADOR', // admin nasce com permissão de catálogo
        ],
      );
      return mapRow(rows[0]);
    },

    async procurarPorEmail(email) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}, password_hash
         FROM utilizadores
         WHERE lower(trim(email)) = lower(trim($1::text))`,
        [email],
      );
      return rows[0] ?? null;
    },

    async procurarPorTelefone(telefone) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}, password_hash
         FROM utilizadores
         WHERE telefone = $1::text`,
        [telefone],
      );
      return rows[0] ?? null;
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}
         FROM utilizadores
         WHERE id = $1::bigint`,
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async procurarCredenciaisPorId(id) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}, password_hash
         FROM utilizadores
         WHERE id = $1::bigint`,
        [id],
      );
      return rows[0] ?? null;
    },

    async atualizarPerfil({ id, nome, email, telefone }) {
      const { rows } = await pool.query(
        `UPDATE utilizadores
         SET nome = $2::text,
             email = $3::text,
             telefone = $4::text,
             updated_at = now()
         WHERE id = $1::bigint
         RETURNING ${COLUNAS_UTILIZADOR}`,
        [id, nome, email, telefone],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async atualizarFotoPerfil({ id, fotoPerfilUrl }) {
      const { rows } = await pool.query(
        `UPDATE utilizadores
         SET foto_perfil_url = $2::text,
             updated_at = now()
         WHERE id = $1::bigint
         RETURNING ${COLUNAS_UTILIZADOR}`,
        [id, fotoPerfilUrl],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async atualizarSenha(id, passwordHash) {
      await pool.query(
        `UPDATE utilizadores
         SET password_hash = $2,
             reset_token = NULL,
             reset_token_expires_at = NULL,
             updated_at = now()
         WHERE id = $1::bigint`,
        [id, passwordHash],
      );
    },

    // --- F11: Gestão de contas internas ---
    async listarInternos() {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}
         FROM utilizadores
         WHERE perfil IN ('FUNCIONARIO','ADMINISTRADOR','MECANICO')
         ORDER BY created_at ASC`,
      );
      return rows.map(mapRow);
    },

    // --- F12: Atribuição de OS a mecânicos ---
    async listarPorPerfil(perfil) {
      const { rows } = await pool.query(
        `SELECT ${COLUNAS_UTILIZADOR}
         FROM utilizadores
         WHERE perfil = $1::text AND ativo = TRUE
         ORDER BY nome ASC`,
        [perfil],
      );
      return rows.map(mapRow);
    },

    async contarAdminsAtivos(excluirId = null) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM utilizadores
         WHERE perfil = 'ADMINISTRADOR'
           AND ativo = TRUE
           AND id <> COALESCE($1::bigint, -1)`,
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
         RETURNING ${COLUNAS_UTILIZADOR}`,
        [id, nome ?? null, ativo ?? null],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async apagarContaInterna(id) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM sessoes WHERE utilizador_id = $1::bigint', [id]);
        const { rowCount } = await client.query(
          `DELETE FROM utilizadores
           WHERE id = $1::bigint
             AND perfil IN ('FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO')`,
          [id],
        );
        await client.query('COMMIT');
        return rowCount > 0;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    // --- ★ Fase 4A: permissão de catálogo ---
    async definirPermissaoCatalogo({ id, pode }) {
      const { rows } = await pool.query(
        `UPDATE utilizadores
         SET pode_gerir_catalogo = $2::boolean,
             updated_at = now()
         WHERE id = $1::bigint
         RETURNING ${COLUNAS_UTILIZADOR}`,
        [id, Boolean(pode)],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    // --- Recuperação de senha ---
    async guardarTokenRecuperacao(id, token, expiraEm) {
      await pool.query(
        `UPDATE utilizadores
         SET reset_token = $2,
             reset_token_expires_at = $3
         WHERE id = $1::bigint`,
        [id, token, expiraEm],
      );
    },

    async procurarPorTokenRecuperacao(token) {
      const { rows } = await pool.query(
        `SELECT id, reset_token, reset_token_expires_at
         FROM utilizadores
         WHERE reset_token = $1
           AND ativo = TRUE`,
        [token],
      );
      return rows[0]
        ? { id: rows[0].id, resetTokenExpiresAt: rows[0].reset_token_expires_at }
        : null;
    },

    async atualizarSenhaEInvalidarToken(id, passwordHash) {
      await pool.query(
        `UPDATE utilizadores
         SET password_hash = $2,
             reset_token = NULL,
             reset_token_expires_at = NULL,
             updated_at = now()
         WHERE id = $1::bigint`,
        [id, passwordHash],
      );
    },
  };
}