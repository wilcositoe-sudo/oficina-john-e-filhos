export const PecaRepository = {
  async criar({ codigo, nome, descricao, precoUnitario, quantidadeStock }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async atualizar({ id, nome, descricao, precoUnitario, quantidadeStock, ativo }) {
    throw new Error('Porta não implementada: atualizar');
  },
  async apagar(id) {
    throw new Error('Porta não implementada: apagar');
  },
  async listarTodos() {
    throw new Error('Porta não implementada: listarTodos');
  },
};