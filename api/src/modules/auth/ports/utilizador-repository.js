// Porta de saída — contrato que o adapter PostgreSQL deve cumprir.
// O caso de uso NUNCA importa 'pg' (regra de dependência, Doc 05 §5.4).
export const UtilizadorRepository = {
  // Deve devolver o utilizador criado { id, nome, email, telefone, perfil, ativo, createdAt }
  async criar({ nome, email, telefone, passwordHash, perfil }) {
    throw new Error('Porta não implementada: criar');
  },
  async procurarPorEmail(email) {
    throw new Error('Porta não implementada: procurarPorEmail');
  },
  async procurarPorTelefone(telefone) {
    throw new Error('Porta não implementada: procurarPorTelefone');
  },
  async procurarPorId(id) {
    throw new Error('Porta não implementada: procurarPorId');
  },
};