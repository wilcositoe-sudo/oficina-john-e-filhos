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
  ultimoAdminAtivo: () =>
    new DomainError('ULTIMO_ADMIN_ATIVO', 'Não é possível desativar o último administrador ativo.', 409),

  // --- Contas (RF20) ---
  emailEmUso: () =>
    new DomainError('EMAIL_EM_USO', 'Já existe uma conta com este e-mail.', 409),
  telefoneEmUso: () =>
    new DomainError('TELEFONE_EM_USO', 'Já existe uma conta com este telefone.', 409),
  utilizadorNaoEncontrado: () =>
    new DomainError('UTILIZADOR_NAO_ENCONTRADO', 'Utilizador não encontrado.', 404),
  clienteNaoEncontrado: () =>
    new DomainError('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.', 404),

  // --- Catálogo (RF01) ---
  servicoNaoEncontrado: () =>
    new DomainError('SERVICO_NAO_ENCONTRADO', 'Serviço não encontrado.', 404),
  servicoInativo: () =>
    new DomainError('SERVICO_INATIVO', 'Este serviço está inativo e não pode ser lançado.', 409),

  // --- Veículos (RN01) ---
  matriculaEmUso: () =>
    new DomainError('MATRICULA_EM_USO', 'Já existe um veículo com esta matrícula.', 409),
  veiculoNaoEncontrado: () =>
    new DomainError('VEICULO_NAO_ENCONTRADO', 'Veículo não encontrado.', 404),

  // --- Peças e stock (RF12, Doc 09 §9.6) ---
  pecaNaoEncontrada: () =>
    new DomainError('PECA_NAO_ENCONTRADA', 'Peça não encontrada.', 404),
  stockInsuficiente: () =>
    new DomainError('STOCK_INSUFICIENTE', 'Stock insuficiente para esta quantidade.', 409),

  // --- Orçamentos (RF02, State) ---
  orcamentoNaoEncontrado: () =>
    new DomainError('ORCAMENTO_NAO_ENCONTRADO', 'Orçamento não encontrado.', 404),
  transicaoInvalida: (estadoAtual) =>
    new DomainError('TRANSICAO_INVALIDA', 'Esta ação não é válida no estado atual.', 409, { estadoAtual }),

  // --- Agendamentos (RF03) ---
  agendamentoNaoEncontrado: () =>
    new DomainError('AGENDAMENTO_NAO_ENCONTRADO', 'Agendamento não encontrado.', 404),
  slotIndisponivel: () =>
    new DomainError('SLOT_INDISPONIVEL', 'Este horário acabou de ser ocupado. Escolha outro.', 409),
  horarioInvalido: (msg = 'Horário inválido.') =>
    new DomainError('HORARIO_INVALIDO', msg, 422),

  // --- Ordens de serviço ---
  osNaoEncontrada: () =>
    new DomainError('OS_NAO_ENCONTRADA', 'Ordem de serviço não encontrada.', 404),
  rn04SemServico: () =>
    new DomainError('RN04_SEM_SERVICO', 'Só é possível concluir com pelo menos um serviço lançado.', 409),

  // --- Pagamentos e recibos (RF06/RF13/RF14, RN06) ---
  osNaoElegivelPagamento: (estado) =>
    new DomainError('OS_NAO_ELEGIVEL_PAGAMENTO', 'O pagamento só é permitido para OS concluída.', 409, { estadoAtual: estado }),
  valorPagamentoInvalido: (esperado) =>
    new DomainError('VALOR_PAGAMENTO_INVALIDO', `O valor tem de corresponder ao total da OS (${esperado} MZN).`, 422, { valorEsperado: esperado }),
  pagamentoNaoEncontrado: () =>
    new DomainError('PAGAMENTO_NAO_ENCONTRADO', 'Pagamento não encontrado.', 404),
  pagamentoNaoConfirmado: () =>
    new DomainError('PAGAMENTO_NAO_CONFIRMADO', 'O recibo só está disponível após confirmação do pagamento.', 409),
  reciboNaoEncontrado: () =>
    new DomainError('RECIBO_NAO_ENCONTRADO', 'Recibo não encontrado.', 404),

  // --- Entrega e avaliações (RF07/RF08/RF09) ---
  modalidadeInvalida: () =>
    new DomainError('MODALIDADE_INVALIDA', 'Modalidade inválida. Use LEVANTAMENTO ou DOMICILIO.', 422),
  osNaoElegivelAvaliacao: (estado) =>
    new DomainError('OS_NAO_ELEGIVEL_AVALIACAO', 'Só pode avaliar após a entrega do veículo.', 409, { estadoAtual: estado }),
  avaliacaoExistente: () =>
    new DomainError('AVALIACAO_EXISTENTE', 'Esta ordem de serviço já foi avaliada.', 409),

  // --- Administração (F11) ---
  contaInternaInvalida: (msg) =>
    new DomainError('CONTA_INTERNA_INVALIDA', msg, 422),
};