// Máquina de estados da OS (Doc 03 §3.8 — hipótese canónica, pendente de aprovação Q01).
// RN03: transições só por ação; o browser nunca envia estado livre.
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

export function podeTransitar(de, para) {
  return (TRANSICOES[de] ?? []).includes(para);
}

export function destinosPossiveis(de) {
  return TRANSICOES[de] ?? [];
}