export const SessaoRepository = {
  async criar({ token, utilizadorId, expiraAt }) {
    throw new Error('Porta não implementada: criar');
  },
  // Devolve sessão ativa ou null (trata revogada/expirada no SQL)
  async procurarAtiva(token) {
    throw new Error('Porta não implementada: procurarAtiva');
  },
  async revogar(token) {
    throw new Error('Porta não implementada: revogar');
  },
};