// Erro de domínio → convertido em resposta HTTP consistente pelo boundary (app.js).
// O domínio nunca conhece HTTP: só lê code/message/status/details (Doc 05 §5.9).
export class DomainError extends Error {
  constructor(code, message, status = 409, details = undefined) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Fábricas: cada chamada cria um erro novo (stack trace correto).
export const erros = {
  // --- Autenticação/autorização (RF19, Doc 04) ---
  credenciaisInvalidas: () =>
    new DomainError('CREDENCIAIS_INVALIDAS', 'Credenciais inválidas.', 401),
  naoAutenticado: () =>
    new DomainError('NAO_AUTENTICADO', 'Sessão inválida ou expirada.', 401),
  naoAutorizado: () =>
    new DomainError('NAO_AUTORIZADO', 'Sem permissão para esta operação.', 403),

  // --- Contas (RF20) ---
  emailEmUso: () =>
    new DomainError('EMAIL_EM_USO', 'Já existe uma conta com este e-mail.', 409),
  telefoneEmUso: () =>
    new DomainError('TELEFONE_EM_USO', 'Já existe uma conta com este telefone.', 409),
  utilizadorNaoEncontrado: () =>
    new DomainError('UTILIZADOR_NAO_ENCONTRADO', 'Utilizador não encontrado.', 404),

  // --- Catálogo (RF01) ---
  servicoNaoEncontrado: () =>
    new DomainError('SERVICO_NAO_ENCONTRADO', 'Servíço não encontrado.', 404),

  // --- Veículos (RN01) ---
  matriculaEmUso: () =>
    new DomainError('MATRICULA_EM_USO', 'Já existe um veículo com esta matrícula.', 409),
  veiculoNaoEncontrado: () =>
    new DomainError('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado.', 404),

  // --- Orçamentos (RF02, State) ---
  orcamentoNaoEncontrado: () =>
    new DomainError('ORCAMENTO_NAO_ENCONTRADO', 'Orçamento não encontrado.', 404),
  transicaoInvalida: (estadoAtual) =>
    new DomainError('TRANSICAO_INVALIDA', 'Esta ação não é válida no estado atual.', 409, { estadoAtual }),
};