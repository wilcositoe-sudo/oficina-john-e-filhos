export const PaymentProvider = {
  async createPayment({ valor, moeda, metodo, referenciaInterna }) {
    throw new Error('Porta não implementada: createPayment');
  },
  async getPaymentStatus(referenciaFornecedor) {
    throw new Error('Porta não implementada: getPaymentStatus');
  },
};
