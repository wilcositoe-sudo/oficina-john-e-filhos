import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  destinatarioPerfil: r.destinatario_perfil,
  destinatarioId: r.destinatario_id,
  titulo: r.titulo,
  corpo: r.corpo,
  ordemId: r.ordem_id,
  tipo: r.tipo,
  lida: r.lida,
  criadoAt: r.criado_at,
  createdAt: r.criado_at,
  created_at: r.criado_at,
});

export function criarPgNotificacaoRepository() {
  return {
    async criar({ destinatarioPerfil, destinatarioId, titulo, corpo, ordemId, tipo }) {
      const { rows } = await pool.query(
        `INSERT INTO notificacoes
           (destinatario_perfil, destinatario_id, titulo, corpo, ordem_id, tipo)
         VALUES ($1::text, $2::bigint, $3::text, $4::text, $5::bigint, $6::text)
         RETURNING id`,
        [destinatarioPerfil, destinatarioId ?? null, titulo, corpo ?? null, ordemId ?? null, tipo ?? 'OS'],
      );
      return rows[0] ?? null;
    },

    async listarPorUtilizador({ utilizadorId, perfil, limite = 30 }) {
      const { rows } = await pool.query(
        `SELECT id, destinatario_perfil, destinatario_id, titulo, corpo,
                ordem_id, tipo, lida, criado_at
         FROM notificacoes
         WHERE destinatario_id = $1::bigint
            OR (destinatario_id IS NULL AND destinatario_perfil = $2::text)
            OR ($2::text = 'ADMINISTRADOR' AND destinatario_id IS NULL AND destinatario_perfil = 'FUNCIONARIO')
         ORDER BY criado_at DESC
         LIMIT $3::int`,
        [utilizadorId, perfil, limite],
      );
      return rows.map(map);
    },

       async marcarLida({ id, utilizadorId, perfil }) {
      const { rowCount } = await pool.query(
        `UPDATE notificacoes SET lida = TRUE
         WHERE id = $1::bigint
           AND (
             destinatario_id = $2::bigint
             OR (destinatario_id IS NULL AND destinatario_perfil = $3::text)
             OR ($3::text = 'ADMINISTRADOR' AND destinatario_id IS NULL AND destinatario_perfil = 'FUNCIONARIO')
           )`,
        [id, utilizadorId, perfil],
      );
      return rowCount > 0;
    },

    async marcarTodasLidas({ utilizadorId, perfil }) {
      const { rowCount } = await pool.query(
        `UPDATE notificacoes SET lida = TRUE
         WHERE lida = FALSE
           AND (destinatario_id = $1::bigint
                OR (destinatario_id IS NULL AND destinatario_perfil = $2::text)
                OR ($2::text = 'ADMINISTRADOR' AND destinatario_id IS NULL AND destinatario_perfil = 'FUNCIONARIO'))`,
        [utilizadorId, perfil],
      );
      return rowCount;
    },
  };
}