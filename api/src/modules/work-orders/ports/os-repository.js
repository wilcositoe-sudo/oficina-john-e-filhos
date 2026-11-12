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
  async listarPorMecanico(mecanicoId) {
    throw new Error('Porta não implementada: listarPorMecanico');
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
  async listarChecklist(ordemId) {
    throw new Error('Porta não implementada: listarChecklist');
  },
  async contarServicos(ordemId) {
    throw new Error('Porta não implementada: contarServicos');
  },
  async guardarChecklist({ ordemId, mecanicoId, itens }) {
    throw new Error('Porta não implementada: guardarChecklist');
  },
  async submeterDiagnostico(dados) {
    throw new Error('Porta não implementada: submeterDiagnostico');
  },
  async atribuirMecanico({
    ordemId,
    mecanicoId,
    estadoAnterior,
    estadoNovo,
    utilizadorId,
    motivo,
  }) {
    throw new Error('Porta não implementada: atribuirMecanico');
  },
  async marcarItensParaRemocao({ ordemId, itensRemover }) {
    throw new Error('Porta não implementada: marcarItensParaRemocao');
  },
  async aplicarRemocoesPendentes(ordemId) {
    throw new Error('Porta não implementada: aplicarRemocoesPendentes');
  },
  async rejeitarRemocoesPendentes(ordemId) {
    throw new Error('Porta não implementada: rejeitarRemocoesPendentes');
  },
  async lancarServicoSemPreco(dados) {
    throw new Error('Porta não implementada: lancarServicoSemPreco');
  },
  async lancarPecaSemPreco(dados) {
    throw new Error('Porta não implementada: lancarPecaSemPreco');
  },
  async precificarLinhaServico({ linhaId, precoUnitario }) {
    throw new Error('Porta não implementada: precificarLinhaServico');
  },
  async precificarLinhaPeca({ linhaId, precoUnitario }) {
    throw new Error('Porta não implementada: precificarLinhaPeca');
  },
  async definirTaxaDiagnostico({ ordemId, taxa }) {
    throw new Error('Porta não implementada: definirTaxaDiagnostico');
  },
  async rejeitarComCobrancaDiagnostico({ ordemId, estadoAnterior, utilizadorId }) {
    throw new Error('Porta não implementada: rejeitarComCobrancaDiagnostico');
  },
  async recalcularTotal(ordemId) {
    throw new Error('Porta não implementada: recalcularTotal');
  },
  async transitar({ ordemId, estadoAnterior, estadoNovo, utilizadorId, motivo }) {
    throw new Error('Porta não implementada: transitar');
  },
  async atualizarEstado({ ordemId, estadoAnterior, estado, utilizadorId, motivo }) {
    throw new Error('Porta não implementada: atualizarEstado');
  },
  // RF07: grava modalidade + taxa e recomputa o total (RN05)
  async definirEntrega({
    ordemId,
    estadoEsperado,
    modalidade,
    taxaEntrega,
    enderecoEntrega,
    entregaLat,
    entregaLng,
  }) {
    throw new Error('Porta não implementada: definirEntrega');
  },
  async removerLinhaServico({ linhaId }) {
    throw new Error('Porta não implementada: removerLinhaServico');
  },
  async removerLinhaPeca({ linhaId }) {
    throw new Error('Porta não implementada: removerLinhaPeca');
  },
};