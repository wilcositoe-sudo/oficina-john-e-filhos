export const AvaliacaoRepository = {
  async criar({ ordemId, clienteId, classificacao, comentario }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorOrdem(ordemId) {
    throw new Error('Porta não implementada: procurarPorOrdem');
  },
  // RF09: só publicadas; sem dados privados (primeiro nome apenas)
  async listarPublicas() {
    throw new Error('Porta não implementada: listarPublicas');
  },
};