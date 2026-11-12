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
      const { rows: pagamentosPorMetodoRows } = await pool.query(
        `SELECT metodo, COUNT(*)::int AS quantidade, COALESCE(SUM(valor), 0)::numeric AS total
         FROM pagamentos
         WHERE estado = 'CONFIRMADO'
           AND ocorrido_at BETWEEN $1::timestamptz AND $2::timestamptz
         GROUP BY metodo
         ORDER BY total DESC, metodo ASC`,
        [inicio, fim],
      );
      const { rows: faturacaoDiariaRows } = await pool.query(
        `SELECT ocorrido_at::date AS data, COALESCE(SUM(valor), 0)::numeric AS total
         FROM pagamentos
         WHERE estado = 'CONFIRMADO'
           AND ocorrido_at BETWEEN $1::timestamptz AND $2::timestamptz
         GROUP BY ocorrido_at::date
         ORDER BY data ASC`,
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
      const { rows: funcionariosRows } = await pool.query(
        `SELECT
           u.id,
           u.nome,
           u.perfil,
           COUNT(DISTINCT mecanico_os.id)::int AS ordens_mecanico,
           COUNT(DISTINCT mecanico_os.id) FILTER (
             WHERE mecanico_os.estado IN ('CONCLUIDA','PAGA','ENTREGUE')
           )::int AS ordens_concluidas,
           COUNT(DISTINCT mecanico_os.id) FILTER (
             WHERE mecanico_os.estado NOT IN ('CONCLUIDA','PAGA','ENTREGUE','CANCELADA','REJEITADA')
           )::int AS ordens_ativas,
           ROUND((
             AVG(EXTRACT(EPOCH FROM (mecanico_os.data_conclusao - mecanico_os.created_at)) / 3600.0)
             FILTER (WHERE mecanico_os.data_conclusao IS NOT NULL)
           )::numeric, 1) AS tempo_medio_horas,
           COUNT(DISTINCT criada_os.id)::int AS ordens_criadas
         FROM utilizadores u
         LEFT JOIN ordens_servico mecanico_os
           ON mecanico_os.mecanico_id = u.id
          AND mecanico_os.created_at BETWEEN $1::timestamptz AND $2::timestamptz
         LEFT JOIN ordens_servico criada_os
           ON criada_os.funcionario_id = u.id
          AND criada_os.created_at BETWEEN $1::timestamptz AND $2::timestamptz
         WHERE u.perfil IN ('FUNCIONARIO','ADMINISTRADOR','MECANICO')
         GROUP BY u.id, u.nome, u.perfil
         ORDER BY ordens_concluidas DESC, ordens_mecanico DESC, u.nome ASC`,
        [inicio, fim],
      );
      const { rows: gestaoRows } = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM clientes) AS total_clientes,
           (SELECT COUNT(*)::int FROM servicos) AS total_servicos,
           (SELECT COUNT(*)::int FROM servicos WHERE ativo = TRUE) AS total_servicos_ativos,
           (SELECT COUNT(*)::int FROM utilizadores
             WHERE perfil = 'MECANICO') AS total_mecanicos,
           (SELECT COUNT(*)::int FROM utilizadores
             WHERE perfil = 'MECANICO' AND ativo = TRUE) AS total_mecanicos_ativos,
           (SELECT COALESCE(SUM(quantidade_stock), 0)::int
             FROM pecas WHERE ativo = TRUE) AS unidades_stock,
           (SELECT COUNT(*)::int
             FROM pecas WHERE ativo = TRUE AND quantidade_stock <= 5) AS pecas_stock_baixo,
           (SELECT COALESCE(SUM(preco_unitario * quantidade_stock), 0)::numeric
             FROM pecas WHERE ativo = TRUE) AS valor_stock`,
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
        financeiro: {
          pagamentosConfirmados: pagamentosPorMetodoRows.reduce((total, linha) => total + linha.quantidade, 0),
          porMetodo: pagamentosPorMetodoRows.map((r) => ({
            metodo: r.metodo,
            quantidade: r.quantidade,
            total: r.total,
          })),
          porDia: faturacaoDiariaRows.map((r) => ({
            data: r.data,
            total: r.total,
          })),
        },
        funcionarios: funcionariosRows.map((r) => ({
          id: r.id,
          nome: r.nome,
          perfil: r.perfil,
          ordensMecanico: r.ordens_mecanico,
          ordensConcluidas: r.ordens_concluidas,
          ordensAtivas: r.ordens_ativas,
          tempoMedioHoras: r.tempo_medio_horas,
          ordensCriadas: r.ordens_criadas,
        })),
        tempoMedioReparacaoHoras: tempoRows[0].horas !== null
          ? Math.round(Number(tempoRows[0].horas) * 10) / 10
          : null,
        servicosMaisSolicitados: servRows.map((r) => ({ nome: r.nome, quantidade: r.quantidade })),
        indicadoresGestao: {
          totalClientes: gestaoRows[0].total_clientes,
          totalServicos: gestaoRows[0].total_servicos,
          totalServicosAtivos: gestaoRows[0].total_servicos_ativos,
          totalMecanicos: gestaoRows[0].total_mecanicos,
          totalMecanicosAtivos: gestaoRows[0].total_mecanicos_ativos,
          unidadesStock: gestaoRows[0].unidades_stock,
          pecasStockBaixo: gestaoRows[0].pecas_stock_baixo,
          valorStock: gestaoRows[0].valor_stock,
        },
      };
    },
  };
}