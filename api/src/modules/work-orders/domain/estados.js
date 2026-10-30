// Máquina de estados da OS (Doc 03 §3.8 — hipótese canónica, pendente de aprovação Q01).
// RN03: transições só por AÇÃO; o browser nunca envia estado livre (Doc 10 §10.6).
export const ESTADOS_OS = Object.freeze({
  PENDENTE: 'PENDENTE',
  EM_DIAGNOSTICO: 'EM_DIAGNOSTICO',
  AGUARDANDO_APROVACAO_ORCAMENTO: 'AGUARDANDO_APROVACAO_ORCAMENTO',
  EM_REPARACAO: 'EM_REPARACAO',
  AGUARDANDO_PECAS: 'AGUARDANDO_PECAS',
  CONCLUIDA: 'CONCLUIDA',
  PAGA: 'PAGA',
  ENTREGUE: 'ENTREGUE',
  CANCELADA: 'CANCELADA',
});

const TRANSICOES = {
  PENDENTE: ['EM_DIAGNOSTICO', 'CANCELADA'],
  EM_DIAGNOSTICO: ['AGUARDANDO_APROVACAO_ORCAMENTO', 'EM_REPARACAO', 'CANCELADA'],
  AGUARDANDO_APROVACAO_ORCAMENTO: ['EM_REPARACAO', 'EM_DIAGNOSTICO', 'CANCELADA'],
  EM_REPARACAO: ['AGUARDANDO_PECAS', 'CONCLUIDA', 'CANCELADA'],
  AGUARDANDO_PECAS: ['EM_REPARACAO', 'CANCELADA'],
  CONCLUIDA: ['PAGA'],
  PAGA: ['ENTREGUE'],
  ENTREGUE: [],
  CANCELADA: [],
};

// Ações de domínio → estado destino
export const ACOES_TRANSICAO = Object.freeze({
  iniciar_diagnostico: 'EM_DIAGNOSTICO',
  aguardar_aprovacao: 'AGUARDANDO_APROVACAO_ORCAMENTO',
  iniciar_reparacao: 'EM_REPARACAO',
  aguardar_pecas: 'AGUARDANDO_PECAS',
  concluir: 'CONCLUIDA',
  cancelar: 'CANCELADA',
  entregar: 'ENTREGUE', // F10 — staff confirma entrega/levantamento
});

// Estados em que ainda é possível lançar linhas ou escolher modalidade de entrega
const EDITAVEIS = [
  'PENDENTE',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO_ORCAMENTO',
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