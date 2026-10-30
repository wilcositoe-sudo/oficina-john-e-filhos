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
  // RF12: lança linha com SNAPSHOT de preço (RN05B) e recomputa valor_total (RN05).
  // Estado editável validado no caso de uso (podeEditar).
  async adicionarServico({ ordemId, servicoId, quantidade }) {
    throw new Error('Porta não implementada: adicionarServico');
  },
  // RF12 + Doc 09 §9.6: débito de stock CONDICIONAL (>= quantidade) — atómico, sem corrida.
  async adicionarPeca({ ordemId, pecaId, quantidade }) {
    throw new Error('Porta não implementada: adicionarPeca');
  },
  async listarLinhas(ordemId) {
    throw new Error('Porta não implementada: listarLinhas');
  },
  async contarServicos(ordemId) {
    throw new Error('Porta não implementada: contarServicos');
  },
  // RN03: UPDATE condicional (WHERE estado = anterior) + histórico na mesma transação.
  // Devolve null se o estado mudou entretanto (corrida) → o caso de uso responde 409.
  async transitar({ ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo }) {
    throw new Error('Porta não implementada: transitar');
  },
};