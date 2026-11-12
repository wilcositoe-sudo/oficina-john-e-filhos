import { pool } from '../../../shared/db/pool.js';

function mapEvidencia(row) {
  return {
    id: row.id,
    ordemId: row.ordem_id,
    tipo: row.tipo,
    referenciaId: row.referencia_id,
    url: row.url,
    mimeType: row.mime_type,
    tamanho: Number(row.tamanho_bytes ?? 0),
    legenda: row.legenda,
    criadoAt: row.criado_at,
  };
}

export function criarPgEvidenciaRepository() {
  return {
    async procurarAcessoOs(ordemId) {
      const { rows } = await pool.query(
        `SELECT id, mecanico_id, estado
         FROM ordens_servico
         WHERE id = $1::bigint`,
        [ordemId],
      );
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        mecanicoId: rows[0].mecanico_id,
        estado: rows[0].estado,
      };
    },
    async listarPorOrdem(ordemId) {
      const { rows } = await pool.query(
        `SELECT id, ordem_id, tipo, referencia_id, url, mime_type,
                tamanho_bytes, legenda, criado_at
         FROM os_evidencias
         WHERE ordem_id = $1::bigint
         ORDER BY criado_at DESC`,
        [ordemId],
      );
      return rows.map(mapEvidencia);
    },
    async criar({
      ordemId,
      tipo,
      referenciaId,
      url,
      mimeType,
      tamanho,
      legenda,
      mecanicoId,
    }) {
      const { rows } = await pool.query(
        `INSERT INTO os_evidencias (
           ordem_id, tipo, referencia_id, url, mime_type,
           tamanho_bytes, legenda, mecanico_id
         )
         VALUES ($1::bigint, $2::text, $3::bigint, $4::text, $5::text, $6::bigint, $7::text, $8::bigint)
         RETURNING id, ordem_id, tipo, referencia_id, url, mime_type,
                   tamanho_bytes, legenda, criado_at`,
        [ordemId, tipo, referenciaId, url, mimeType, tamanho, legenda, mecanicoId],
      );
      return mapEvidencia(rows[0]);
    },
  };
}
