export const VeiculoRepository = {
  async criar({ utilizadorId, matricula, marca, modelo, ano }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorMatricula(matricula) {
    throw new Error('Porta não implementada: procurarPorMatricula');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async atualizar({ id, utilizadorId, matricula, marca, modelo, ano }) {
    throw new Error('Porta não implementada: atualizar');
  },
  async listarPorUtilizador(utilizadorId) {
    throw new Error('Porta não implementada: listarPorUtilizador');
  },
};