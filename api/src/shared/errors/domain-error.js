// Erro de domínio → convertido em resposta HTTP consistente pelo boundary (app.js)
export class DomainError extends Error {
  constructor(code, message, status = 409, details = undefined) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const erros = {
  credenciaisInvalidas: () =>
    new DomainError('CREDENCIAIS_INVALIDAS', 'Credenciais inválidas.', 401),
  naoAutenticado: () =>
    new DomainError('NAO_AUTENTICADO', 'Sessão inválida ou expirada.', 401),
  emailEmUso: () =>
    new DomainError('EMAIL_EM_USO', 'Já existe uma conta com este e-mail.', 409),
  telefoneEmUso: () =>
    new DomainError('TELEFONE_EM_USO', 'Já existe uma conta com este telefone.', 409),
  utilizadorNaoEncontrado: () =>
    new DomainError('UTILIZADOR_NAO_ENCONTRADO', 'Utilizador não encontrado.', 404),
    naoAutorizado: () =>
    new DomainError('NAO_AUTORIZADO', 'Sem permissão para esta operação.', 403),
  servicoNaoEncontrado: () =>
    new DomainError('SERVICO_NAO_ENCONTRADO', 'Serviço não encontrado.', 404),
    matriculaEmUso: () =>
    new DomainError('MATRICULA_EM_USO', 'Já existe um veículo com esta matrícula.', 409),
  veiculoNaoEncontrado: () =>
    new DomainError('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado.', 404),
};