export const NotificacaoRepository = {
  async criar(dados) {
    throw new Error('Porta não implementada: criar');
  },
  async listarPorUtilizador({ utilizadorId, perfil, limite }) {
    throw new Error('Porta não implementada: listarPorUtilizador');
  },
  async marcarLida({ id, utilizadorId, perfil }) {
    throw new Error('Porta não implementada: marcarLida');
  },
  async marcarTodasLidas({ utilizadorId, perfil }) {
    throw new Error('Porta não implementada: marcarTodasLidas');
  },
};
