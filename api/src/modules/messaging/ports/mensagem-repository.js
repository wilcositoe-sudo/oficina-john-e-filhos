export const MensagemRepository = {
  async criar({ ordemId, remetenteId, conteudo }) {
    throw new Error('Porta não implementada: criar');
  },
  async listarPorOrdem(ordemId) {
    throw new Error('Porta não implementada: listarPorOrdem');
  },
};