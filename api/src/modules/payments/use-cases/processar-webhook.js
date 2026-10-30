// Webhook: evento idempotente (tabela eventos_pagamento) + aplicação do resultado.
// Confirmação segue para o mesmo caminho partilhado (auto-PAGA + recibo).
export function criarProcessarWebhook({ pagamentoRepo, osRepo, confirmacao }) {
  return async function processarWebhook({ fornecedor, idEvento, referenciaInterna, confirmar }) {
    const { duplicado, pagamento } = await pagamentoRepo.processarEvento({
      fornecedor,
      idEvento,
      referenciaInterna,
      confirmar,
    });
    if (duplicado) return { duplicado: true, pagamento: null, os: null, recibo: null };
    if (!pagamento) return { duplicado: false, pagamento: null, os: null, recibo: null }; // já decidido

    if (pagamento.estado !== 'CONFIRMADO') {
      return { duplicado: false, pagamento, os: null, recibo: null };
    }

    const { os, recibo } = await confirmacao(pagamento);
    return { duplicado: false, pagamento, os, recibo };
  };
}