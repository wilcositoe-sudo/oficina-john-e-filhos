// Adapter FAKE do fornecedor de pagamento (DEC-D18).
// Em produção será substituído por um ProviderRealAdapter com a MESMA porta.
// A "confirmação" chega via POST /webhooks/pagamentos/fake (simula o callback do fornecedor).
export function criarFakePaymentProvider() {
  return {
    // Cria a intenção no "fornecedor" e devolve a referência externa
    async createPayment({ valor, moeda, metodo, referenciaInterna }) {
      return {
        referenciaFornecedor: `FAKE-${referenciaInterna}`,
        estadoFornecedor: 'PENDENTE',
        // Em dev não há URL externa — o webhook é chamado manualmente/no smoke
      };
    },
    async getPaymentStatus(referenciaFornecedor) {
      return { referenciaFornecedor, estadoFornecedor: 'DESCONHECIDO_DEV' };
    },
  };
}