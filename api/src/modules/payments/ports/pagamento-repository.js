export const PagamentoRepository = {
  // Devolve pagamento existente com a mesma chave de idempotência (ou null)
  async procurarPorChaveIdempotencia(chave) {
    throw new Error('Porta não implementada: procurarPorChaveIdempotencia');
  },
  async criar({ ordemId, valor, moeda, metodo, estado, referenciaInterna, referenciaFornecedor, chaveIdempotencia, criadoPor }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorReferenciaInterna(ref) {
    throw new Error('Porta não implementada: procurarPorReferenciaInterna');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async listarPorOrdem(ordemId) {
    throw new Error('Porta não implementada: listarPorOrdem');
  },
  async somaConfirmada(ordemId) {
    throw new Error('Porta não implementada: somaConfirmada');
  },
  // Webhook idempotente: regista evento (único) e aplica resultado só se PENDENTE
  async processarEvento({ fornecedor, idEvento, referenciaInterna, confirmar }) {
    throw new Error('Porta não implementada: processarEvento');
  },
  // Recibo: um por pagamento (UNIQUE pagamento_id) — reimpressão devolve o mesmo
  async criarRecibo({ pagamentoId, snapshot }) {
    throw new Error('Porta não implementada: criarRecibo');
  },
  async procurarReciboPorPagamento(pagamentoId) {
    throw new Error('Porta não implementada: procurarReciboPorPagamento');
  },
};