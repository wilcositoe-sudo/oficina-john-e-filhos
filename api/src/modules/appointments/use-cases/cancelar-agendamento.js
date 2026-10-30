import { erros } from '../../../shared/errors/domain-error.js';

export function criarCancelarAgendamento({ agendamentoRepo }) {
  return async function cancelarAgendamento({ id, utilizador, isStaff }) {
    const ag = await agendamentoRepo.procurarPorId(id);
    if (!ag) throw erros.agendamentoNaoEncontrado();
    if (!isStaff && ag.utilizadorId !== utilizador.id) throw erros.naoAutorizado();

    const cancelado = await agendamentoRepo.cancelarCondicional(id);
    if (!cancelado) throw erros.transicaoInvalida(ag.estado);
    return cancelado;
  };
}