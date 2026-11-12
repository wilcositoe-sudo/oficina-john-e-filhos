import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createPaymentsRouter({ requireAuth, registar, webhook, listar, recibo }) {
  const router = Router();

  router.post('/ordens/:id/pagamentos', requireAuth, asyncRoute(async (req, res) => {
    const resultado = await registar({ ordemId: req.params.id, utilizador: req.utilizador, ...(req.body ?? {}) });
    const foiIdempotente = resultado.idempotente === true;
    res.status(foiIdempotente ? 200 : 201).json({ data: resultado });
  }));

  router.get('/ordens/:id/pagamentos', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listar({ ordemId: req.params.id, utilizador: req.utilizador }) });
  }));

  router.get('/pagamentos/:id/recibo', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await recibo({ pagamentoId: req.params.id, utilizador: req.utilizador }) });
  }));

  // Webhook FAKE do fornecedor (DEC-D18): em produção, fornecedor real + assinatura.
  // Idempotente por (fornecedor, idEvento) — evento repetido não duplica efeito.
  router.post('/webhooks/pagamentos/fake', asyncRoute(async (req, res) => {
    const { referenciaInterna, resultado, idEvento } = req.body ?? {};
    if (!referenciaInterna || !idEvento || !['sucesso', 'falha'].includes(resultado)) {
      return res.status(400).json({ error: { code: 'WEBHOOK_INVALIDO', message: 'Payload inválido.' } });
    }
    const r = await webhook({
      fornecedor: 'fake',
      idEvento: String(idEvento),
      referenciaInterna: String(referenciaInterna),
      confirmar: resultado === 'sucesso',
    });
    res.json({ data: { duplicado: r.duplicado, estado: r.pagamento?.estado ?? null, osEstado: r.os?.estado ?? null, recibo: r.recibo?.numero ?? null } });
  }));

  return router;
}