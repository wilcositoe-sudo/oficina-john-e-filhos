export const PecaRepository = {
  async criar({ codigo, nome, descricao, precoUnitario, quantidadeStock }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async listarTodos() {
    throw new Error('Porta não implementada: listarTodos');
  },
};