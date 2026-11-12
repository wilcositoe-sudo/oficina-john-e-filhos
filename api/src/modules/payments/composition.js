import { criarPgPagamentoRepository } from './adapters/pg-pagamento-repository.js';
import { criarFakePaymentProvider } from './adapters/fake-payment-provider.js';
import { criarConfirmacaoPagamento } from './use-cases/confirmacao-pagamento.js';
import { criarRegistarPagamento } from './use-cases/registar-pagamento.js';
import { criarProcessarWebhook } from './use-cases/processar-webhook.js';
import { criarListarPagamentos } from './use-cases/listar-pagamentos.js';
import { criarObterRecibo } from './use-cases/obter-recibo.js';

export function createPaymentsDependencies({ requireAuth, osRepo }) {
  const pagamentoRepo = criarPgPagamentoRepository();
  const provider = criarFakePaymentProvider();
  const confirmacao = criarConfirmacaoPagamento({ pagamentoRepo, osRepo });

  return {
    requireAuth,
    registar: criarRegistarPagamento({ pagamentoRepo, osRepo, provider, confirmacao }),
    webhook: criarProcessarWebhook({ pagamentoRepo, osRepo, confirmacao }),
    listar: criarListarPagamentos({ pagamentoRepo, osRepo }),
    recibo: criarObterRecibo({ pagamentoRepo, osRepo }),
  };
}
