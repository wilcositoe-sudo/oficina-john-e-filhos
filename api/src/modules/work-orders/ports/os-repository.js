export const OsRepository = {
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
  async adicionarServico({ ordemId, servicoId, quantidade }) {
    throw new Error('Porta não implementada: adicionarServico');
  },
  async adicionarPeca({ ordemId, pecaId, quantidade }) {
    throw new Error('Porta não implementada: adicionarPeca');
  },
  async listarLinhas(ordemId) {
    throw new Error('Porta não implementada: listarLinhas');
  },
  async contarServicos(ordemId) {
    throw new Error('Porta não implementada: contarServicos');
  },
  async transitar({ ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo }) {
    throw new Error('Porta não implementada: transitar');
  },
  // RF07: grava modalidade + taxa e recomputa o total (RN05)
  async definirEntrega({ ordemId, modalidade, taxaEntrega }) {
    throw new Error('Porta não implementada: definirEntrega');
  },
};