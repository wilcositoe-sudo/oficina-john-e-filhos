// Porta de saída do módulo quotes — o caso de uso só conhece este contrato.
export const OrcamentoRepository = {
  async criar({ utilizadorId, veiculoId, descricaoProblema }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async listarPorUtilizador(utilizadorId) {
    throw new Error('Porta não implementada: listarPorUtilizador');
  },
  async listarTodos() {
    throw new Error('Porta não implementada: listarTodos');
  },
  // Transação: substitui linhas e envia proposta (estado + total + validade)
  async gravarResposta({ id, linhas, totalEstimado, validadeAte }) {
    throw new Error('Porta não implementada: gravarResposta');
  },
  // UPDATE condicional: só afeta se estado = ENVIADO (devolve null se já decidido)
  async decidir({ id, estado, aprovadoAt }) {
    throw new Error('Porta não implementada: decidir');
  },
};