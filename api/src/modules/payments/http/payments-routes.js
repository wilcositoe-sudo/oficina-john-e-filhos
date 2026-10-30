import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgPagamentoRepository } from '../adapters/pg-pagamento-repository.js';
import { criarFakePaymentProvider } from '../adapters/fake-payment-provider.js';
import { criarPgOsRepository } from '../../work-orders/adapters/pg-os-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth } from '../../auth/http/session-middleware.js';
import { criarRegistarPagamento } from '../use-cases/registar-pagamento.js';
import { criarProcessarWebhook } from '../use-cases/processar-webhook.js';
import { criarConfirmacaoPagamento } from '../use-cases/confirmacao-pagamento.js';
import { criarListarPagamentos } from '../use-cases/listar-pagamentos.js';
import { criarObterRecibo } from '../use-cases/obter-recibo.js';

export function createPaymentsRouter() {
  const router = Router();
  const pagamentoRepo = criarPgPagamentoRepository();
  const osRepo = criarPgOsRepository();
  const provider = criarFakePaymentProvider();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });

  // Lógica partilhada: presencial e webhook usam o MESMO caminho de confirmação
  const confirmacao = criarConfirmacaoPagamento({ pagamentoRepo, osRepo });
  const registar = criarRegistarPagamento({ pagamentoRepo, osRepo, provider, confirmacao });
  const webhook = criarProcessarWebhook({ pagamentoRepo, osRepo, confirmacao });
  const listar = criarListarPagamentos({ pagamentoRepo, osRepo });
  const recibo = criarObterRecibo({ pagamentoRepo, osRepo });

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