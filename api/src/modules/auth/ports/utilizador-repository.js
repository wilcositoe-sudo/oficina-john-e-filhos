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
  async procurarCredenciaisPorId(id) {
    throw new Error('Porta não implementada: procurarCredenciaisPorId');
  },
  async atualizarPerfil({ id, nome, email, telefone }) {
    throw new Error('Porta não implementada: atualizarPerfil');
  },
  async atualizarFotoPerfil({ id, fotoPerfilUrl }) {
    throw new Error('Porta não implementada: atualizarFotoPerfil');
  },
  async atualizarSenha(id, passwordHash) {
    throw new Error('Porta não implementada: atualizarSenha');
  },
  async listarPorPerfil(perfil) {
    throw new Error('Porta não implementada: listarPorPerfil');
  },
  async listarInternos() {
    throw new Error('Porta não implementada: listarInternos');
  },
  async contarAdminsAtivos(excluirId) {
    throw new Error('Porta não implementada: contarAdminsAtivos');
  },
  async atualizarContaInterna({ id, nome, ativo }) {
    throw new Error('Porta não implementada: atualizarContaInterna');
  },
  async apagarContaInterna(id) {
    throw new Error('Porta não implementada: apagarContaInterna');
  },
  async definirPermissaoCatalogo({ id, pode }) {
    throw new Error('Porta não implementada: definirPermissaoCatalogo');
  },
  async guardarTokenRecuperacao(id, token, expiraEm) {
    throw new Error('Porta não implementada: guardarTokenRecuperacao');
  },
  async procurarPorTokenRecuperacao(token) {
    throw new Error('Porta não implementada: procurarPorTokenRecuperacao');
  },
  async atualizarSenhaEInvalidarToken(id, passwordHash) {
    throw new Error('Porta não implementada: atualizarSenhaEInvalidarToken');
  },
};