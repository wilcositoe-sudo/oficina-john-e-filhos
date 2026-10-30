export const AgendamentoRepository = {
  // Devolve as datas/horas de início ocupadas num dia (estados ativos)
  async ocupadosNoDia(dataISO) {
    throw new Error('Porta não implementada: ocupadosNoDia');
  },
  // Reserva condicional: falha (null) se o slot ficou ocupado entre a consulta e a reserva.
  // Anti-corrida: advisory lock serializa escritores do mesmo slot (Doc 09 §9.6).
  async criarCondicional({ utilizadorId, veiculoId, inicioAt, fimAt }) {
    throw new Error('Porta não implementada: criarCondicional');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
  async listarPorUtilizador(utilizadorId) {
    throw new Error('Porta não implementada: listarPorUtilizador');
  },
  async listarTodos() {
    throw new Error('Porta não implementada: listarTodos');
  },
  // Só cancela se ativo e futuro (devolve null caso contrário)
  async cancelarCondicional(id) {
    throw new Error('Porta não implementada: cancelarCondicional');
  },
};