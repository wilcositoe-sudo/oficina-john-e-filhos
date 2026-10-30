export const OsRepository = {
  // Transação: INSERT OS (numero gerado) + histórico inicial PENDENTE
  async criar({ clienteId, veiculoId, funcionarioId, descricaoProblema, orcamentoId }) {
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
  async listarHistorico(ordemId) {
    throw new Error('Porta não implementada: listarHistorico');
  },
  // (Passo 2) linhas, stock e transições entram aqui
};