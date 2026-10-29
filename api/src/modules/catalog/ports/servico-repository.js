export const ServicoRepository = {
  async listarAtivos() {
    throw new Error('Porta não implementada: listarAtivos');
  },
    async criar({ codigo, nome, descricao, precoBase }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async desativar(id) {
    throw new Error('Porta não implementada: desativar');
  },
};