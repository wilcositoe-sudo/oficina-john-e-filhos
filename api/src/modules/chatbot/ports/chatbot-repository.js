export const ChatbotRepository = {
  async obterClientePorUtilizador(utilizadorId) {
    throw new Error('Porta não implementada: obterClientePorUtilizador');
  },
  async listarVeiculos(clienteId) {
    throw new Error('Porta não implementada: listarVeiculos');
  },
  async listarServicos() {
    throw new Error('Porta não implementada: listarServicos');
  },
  async listarPecas() {
    throw new Error('Porta não implementada: listarPecas');
  },
  async garantirConversa(dados) {
    throw new Error('Porta não implementada: garantirConversa');
  },
  async obterConversa(id) {
    throw new Error('Porta não implementada: obterConversa');
  },
  async listarConversasStaff() {
    throw new Error('Porta não implementada: listarConversasStaff');
  },
  async listarConversasCliente(utilizadorId) {
    throw new Error('Porta não implementada: listarConversasCliente');
  },
  async ocultarConversa({ conversaId, utilizadorId }) {
    throw new Error('Porta não implementada: ocultarConversa');
  },
  async conversaOcultada({ conversaId, utilizadorId }) {
    throw new Error('Porta não implementada: conversaOcultada');
  },
  async listarMensagens(conversaId) {
    throw new Error('Porta não implementada: listarMensagens');
  },
  async criarMensagem(dados) {
    throw new Error('Porta não implementada: criarMensagem');
  },
  async atualizarConversa(dados) {
    throw new Error('Porta não implementada: atualizarConversa');
  },
  async incrementarNaoLidasStaff(conversaId) {
    throw new Error('Porta não implementada: incrementarNaoLidasStaff');
  },
  async zerarNaoLidasStaff(conversaId) {
    throw new Error('Porta não implementada: zerarNaoLidasStaff');
  },
  async incrementarNaoLidasCliente(conversaId) {
    throw new Error('Porta não implementada: incrementarNaoLidasCliente');
  },
  async zerarNaoLidasCliente(conversaId) {
    throw new Error('Porta não implementada: zerarNaoLidasCliente');
  },
  async apagarExpiradas() {
    throw new Error('Porta não implementada: apagarExpiradas');
  },
  async listarReservasEntre(inicio, fim) {
    throw new Error('Porta não implementada: listarReservasEntre');
  },
  async criarReserva(dados) {
    throw new Error('Porta não implementada: criarReserva');
  },
  async cancelarReservasDaConversa(conversaId) {
    throw new Error('Porta não implementada: cancelarReservasDaConversa');
  },
};
