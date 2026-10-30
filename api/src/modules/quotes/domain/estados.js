// Ciclo de vida do orçamento (Doc 03 §3.3 / hipótese §3.8 — pendente de aprovação da oficina)
export const ESTADOS_ORCAMENTO = Object.freeze({
  SOLICITADO: 'SOLICITADO',
  ENVIADO: 'ENVIADO',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
  EXPIRADO: 'EXPIRADO',
  CONVERTIDO: 'CONVERTIDO',
});

// Staff pode responder proposta quando o pedido está em aberto
export function podeResponder(estado) {
  return estado === ESTADOS_ORCAMENTO.SOLICITADO;
}

// Cliente só decide sobre proposta já enviada
export function podeDecidir(estado) {
  return estado === ESTADOS_ORCAMENTO.ENVIADO;
}