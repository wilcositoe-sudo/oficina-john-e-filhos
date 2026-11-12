export const MensagemRepository = {
  async criar({ ordemId, remetenteId, conteudo }) {
    throw new Error('Porta não implementada: criar');
  },
  async listarPorOrdem(ordemId) {
    throw new Error('Porta não implementada: listarPorOrdem');
  },
  async listarConversas({ utilizador }) {
    throw new Error('Porta não implementada: listarConversas');
  },
  async marcarLidas({ ordemId, utilizadorId }) {
    throw new Error('Porta não implementada: marcarLidas');
  },
  async ocultarConversa({ ordemId, utilizadorId }) {
    throw new Error('Porta não implementada: ocultarConversa');
  },
};