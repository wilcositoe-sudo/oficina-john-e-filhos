import crypto from 'node:crypto';
import { pool } from '../../../shared/db/pool.js';

const map = (r) => ({
  id: r.id,
  ordemId: r.ordem_id,
  valor: r.valor,
  moeda: r.moeda,
  metodo: r.metodo,
  estado: r.estado,
  referenciaInterna: r.referencia_interna,
  referenciaFornecedor: r.referencia_fornecedor,
  ocorridoAt: r.ocorrido_at,
  createdAt: r.created_at,
});

export function criarPgPagamentoRepository() {
  return {
    async procurarPorChaveIdempotencia(chave) {
      const { rows } = await pool.query(
        'SELECT id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at FROM pagamentos WHERE chave_idempotencia = $1::text',
        [chave],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async criar({ ordemId, valor, moeda, metodo, estado, referenciaInterna, referenciaFornecedor, chaveIdempotencia, criadoPor }) {
      const { rows } = await pool.query(
        `INSERT INTO pagamentos (ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, chave_idempotencia, ocorrido_at, criado_por)
         VALUES ($1::bigint, $2::numeric, $3::char(3), $4::text, $5::text, $6::text, $7::text, $8::text,
                 CASE WHEN $5::text = 'CONFIRMADO' THEN now() ELSE NULL END, $9::bigint)
         RETURNING id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at`,
        [ordemId, valor, moeda, metodo, estado, referenciaInterna, referenciaFornecedor ?? null, chaveIdempotencia, criadoPor ?? null],
      );
      return map(rows[0]);
    },

    async procurarPorReferenciaInterna(ref) {
      const { rows } = await pool.query(
        'SELECT id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at FROM pagamentos WHERE referencia_interna = $1::text',
        [ref],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async procurarPorId(id) {
      const { rows } = await pool.query(
        'SELECT id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at FROM pagamentos WHERE id = $1::bigint',
        [id],
      );
      return rows[0] ? map(rows[0]) : null;
    },

    async listarPorOrdem(ordemId) {
      const { rows } = await pool.query(
        `SELECT id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at
         FROM pagamentos WHERE ordem_id = $1::bigint ORDER BY created_at DESC`,
        [ordemId],
      );
      return rows.map(map);
    },

    async somaConfirmada(ordemId) {
      const { rows } = await pool.query(
        `SELECT COALESCE(SUM(valor), 0)::numeric AS total FROM pagamentos
         WHERE ordem_id = $1::bigint AND estado = 'CONFIRMADO'`,
        [ordemId],
      );
      return rows[0].total; // string decimal exato (RN05)
    },

    // Idempotência de webhook (Doc 03 §3.6): evento único por fornecedor/id;
    // resultado só se ainda PENDENTE (devolve o pagamento afetado ou null).
    async processarEvento({ fornecedor, idEvento, referenciaInterna, confirmar }) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: ev } = await client.query(
          `INSERT INTO eventos_pagamento (fornecedor, id_evento) VALUES ($1::text, $2::text)
           ON CONFLICT (fornecedor, id_evento) DO NOTHING RETURNING id`,
          [fornecedor, idEvento],
        );
        if (!ev[0]) {
          await client.query('COMMIT');
          return { duplicado: true, pagamento: null };
        }
        // CORRIGIDO: parâmetros $1 e $2 (antes $2/$3 com array de 2 — $1 ficava por tipar)
        const { rows: p } = await client.query(
          `UPDATE pagamentos SET estado = $1::text, ocorrido_at = now()
           WHERE referencia_interna = $2::text AND estado = 'PENDENTE'
           RETURNING id, ordem_id, valor, moeda, metodo, estado, referencia_interna, referencia_fornecedor, ocorrido_at, created_at`,
          [confirmar ? 'CONFIRMADO' : 'RECUSADO', referenciaInterna],
        );
        await client.query('COMMIT');
        return { duplicado: false, pagamento: p[0] ? map(p[0]) : null };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async criarRecibo({ pagamentoId, snapshot }) {
      const { rows } = await pool.query(
        `INSERT INTO recibos (pagamento_id, numero, snapshot_documento)
         VALUES ($1::bigint,
                 'REC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('recibos_numero_seq')::text, 6, '0'),
                 $2::jsonb)
         ON CONFLICT (pagamento_id) DO NOTHING
         RETURNING id, pagamento_id, numero, emitido_at, snapshot_documento, estado`,
        [pagamentoId, JSON.stringify(snapshot)],
      );
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        pagamentoId: rows[0].pagamento_id,
        numero: rows[0].numero,
        emitidoAt: rows[0].emitido_at,
        snapshot: rows[0].snapshot_documento,
        estado: rows[0].estado,
      };
    },

    async procurarReciboPorPagamento(pagamentoId) {
      const { rows } = await pool.query(
        'SELECT id, pagamento_id, numero, emitido_at, snapshot_documento, estado FROM recibos WHERE pagamento_id = $1::bigint',
        [pagamentoId],
      );
      if (!rows[0]) return null;
      return {
        id: rows[0].id,
        pagamentoId: rows[0].pagamento_id,
        numero: rows[0].numero,
        emitidoAt: rows[0].emitido_at,
        snapshot: rows[0].snapshot_documento,
        estado: rows[0].estado,
      };
    },
  };
}

// Referências internas únicas (formato legível + aleatório)
export function novaReferenciaInterna() {
  return `PAG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}