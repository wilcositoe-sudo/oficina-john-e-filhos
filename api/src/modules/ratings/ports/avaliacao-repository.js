export const AvaliacaoRepository = {
  async criar({ ordemId, clienteId, classificacao, comentario }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorOrdem(ordemId) {
    throw new Error('Porta não implementada: procurarPorOrdem');
  },
  async listarPublicas() {
    throw new Error('Porta não implementada: listarPublicas');
  },
  // NOVO: Lista todas as avaliações (para moderação do Admin)
  async listarTodas() {
    throw new Error('Porta não implementada: listarTodas');
  },
  // NOVO: Altera o estado de publicação
  async atualizarPublicacao({ id, publicada }) {
    throw new Error('Porta não implementada: atualizarPublicacao');
  },
};