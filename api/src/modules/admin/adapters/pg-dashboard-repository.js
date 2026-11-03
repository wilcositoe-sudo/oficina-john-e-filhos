import { pool } from '../../../shared/db/pool.js';

export function criarPgDashboardRepository() {
  return {
    async consultar({ inicio, fim }) {
      const { rows: osRows } = await pool.query(
        `SELECT estado, COUNT(*)::int AS total
         FROM ordens_servico
         WHERE created_at BETWEEN $1::timestamptz AND $2::timestamptz
         GROUP BY estado`,
        [inicio, fim],
      );
      const { rows: fatRows } = await pool.query(
        `SELECT COALESCE(SUM(valor), 0)::numeric AS total
         FROM pagamentos
         WHERE estado = 'CONFIRMADO' AND ocorrido_at BETWEEN $1::timestamptz AND $2::timestamptz`,
        [inicio, fim],
      );
      const { rows: tempoRows } = await pool.query(
        `SELECT EXTRACT(EPOCH FROM AVG(data_conclusao - created_at)) / 3600.0 AS horas
         FROM ordens_servico
         WHERE data_conclusao IS NOT NULL
           AND estado <> 'CANCELADA'
           AND data_conclusao BETWEEN $1::timestamptz AND $2::timestamptz`,
        [inicio, fim],
      );
      const { rows: servRows } = await pool.query(
        `SELECT s.nome, SUM(so.quantidade)::numeric AS quantidade
         FROM servicos_os so
         JOIN servicos s ON s.id = so.servico_id
         JOIN ordens_servico o ON o.id = so.ordem_id
         WHERE o.created_at BETWEEN $1::timestamptz AND $2::timestamptz
           AND o.estado <> 'CANCELADA'
         GROUP BY s.nome
         ORDER BY quantidade DESC
         LIMIT 5`,
        [inicio, fim],
      );

      const osPorEstado = {};
      let totalOS = 0;
      for (const r of osRows) {
        osPorEstado[r.estado] = r.total;
        totalOS += r.total;
      }

      return {
        periodo: { inicio, fim },
        totalOS,
        osPorEstado,
        faturacaoTotal: fatRows[0].total,
        tempoMedioReparacaoHoras: tempoRows[0].horas !== null
          ? Math.round(Number(tempoRows[0].horas) * 10) / 10
          : null,
        servicosMaisSolicitados: servRows.map((r) => ({ nome: r.nome, quantidade: r.quantidade })),
      };
    },
  };
}