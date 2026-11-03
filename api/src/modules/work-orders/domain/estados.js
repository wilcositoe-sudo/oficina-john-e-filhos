// Máquina de estados da OS (Doc 03 §3.8 — atualizada para o fluxo Mecânico/Funcionário).
// RN03: transições só por AÇÃO; o browser nunca envia estado livre.

export const ESTADOS_OS = Object.freeze({
  // Estados Clássicos
  PENDENTE: 'PENDENTE',
  EM_DIAGNOSTICO: 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO_ORCAMENTO: 'AGUARDANDO_APROVACAO_ORCAMENTO', // Legado/Compatibilidade
  EM_REPARACAO: 'EM_REPARACAO',
  AGUARDANDO_PECAS: 'AGUARDANDO_PECAS',
  CONCLUIDA: 'CONCLUIDA',
  PAGA: 'PAGA',
  ENTREGUE: 'ENTREGUE',
  CANCELADA: 'CANCELADA',
  
  // Novos Estados do Fluxo de Diagnóstico e Aprovação
  AGUARDANDO_PRECO_FUNCIONARIO: 'AGUARDANDO_PRECO_FUNCIONARIO',
  AGUARDANDO_APROVACAO_CLIENTE: 'AGUARDANDO_APROVACAO_CLIENTE',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'AGUARDANDO_VALIDACAO_FUNCIONARIO',
  REJEITADA: 'REJEITADA',
});

// Mapa de transições válidas: [Estado Atual] -> [Estados Destino Possíveis]
const TRANSICOES = {
  PENDENTE: ['EM_DIAGNOSTICO', 'CANCELADA'],
  EM_DIAGNOSTICO: ['AGUARDANDO_PRECO_FUNCIONARIO', 'EM_REPARACAO', 'CANCELADA'], // Mecânico termina diagnóstico
  AGUARDANDO_PRECO_FUNCIONARIO: ['AGUARDANDO_APROVACAO_CLIENTE', 'CANCELADA'], // Funcionário precifica
  AGUARDANDO_APROVACAO_CLIENTE: [
    'EM_REPARACAO', // Cliente aprova tudo
    'AGUARDANDO_VALIDACAO_FUNCIONARIO', // Cliente modifica (remove itens)
    'REJEITADA', // Cliente rejeita (ativa cobrança de taxa)
    'CANCELADA'
  ],
  AGUARDANDO_VALIDACAO_FUNCIONARIO: ['EM_REPARACAO', 'CANCELADA'], // Funcionário valida os cortes do cliente
  AGUARDANDO_APROVACAO_ORCAMENTO: ['EM_REPARACAO', 'EM_DIAGNOSTICO', 'CANCELADA'], // Legado
  EM_REPARACAO: ['AGUARDANDO_PECAS', 'CONCLUIDA', 'CANCELADA'],
  AGUARDANDO_PECAS: ['EM_REPARACAO', 'CANCELADA'],
  CONCLUIDA: ['PAGA'],
  PAGA: ['ENTREGUE'],
  ENTREGUE: [],
  REJEITADA: [], // Estado terminal (só pode ser reaberto via ajuste administrativo)
  CANCELADA: [],
};

// Ações de domínio -> estado destino
export const ACOES_TRANSICAO = Object.freeze({
  iniciar_diagnostico: 'EM_DIAGNOSTICO',
  finalizar_diagnostico: 'AGUARDANDO_PRECO_FUNCIONARIO', // NOVO: Ação do Mecânico
  precificar: 'AGUARDANDO_APROVACAO_CLIENTE', // NOVO: Ação do Funcionário
  aprovar_cliente: 'EM_REPARACAO', // NOVO: Cliente aprova
  solicitar_revisao: 'AGUARDANDO_VALIDACAO_FUNCIONARIO', // NOVO: Cliente modifica
  validar_revisao: 'EM_REPARACAO', // NOVO: Funcionário aceita os cortes
  rejeitar: 'REJEITADA', // NOVO: Cliente rejeita
  aguardar_aprovacao: 'AGUARDANDO_APROVACAO_ORCAMENTO', // Legado
  iniciar_reparacao: 'EM_REPARACAO',
  aguardar_pecas: 'AGUARDANDO_PECAS',
  concluir: 'CONCLUIDA',
  cancelar: 'CANCELADA',
  entregar: 'ENTREGUE',
});

// Estados em que ainda é possível lançar linhas (serviços/peças)
const EDITAVEIS = [
  'PENDENTE',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_PRECO_FUNCIONARIO',
  'AGUARDANDO_APROVACAO_CLIENTE',
  'AGUARDANDO_VALIDACAO_FUNCIONARIO',
  'EM_REPARACAO',
  'AGUARDANDO_PECAS',
];

export function podeTransitar(de, para) {
  return (TRANSICOES[de] ?? []).includes(para);
}

export function destinosPossiveis(de) {
  return TRANSICOES[de] ?? [];
}

export function podeEditar(estado) {
  return EDITAVEIS.includes(estado);
}