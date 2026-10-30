export function criarListarMeusAgendamentos({ agendamentoRepo }) {
  return async function listarMeusAgendamentos({ utilizadorId }) {
    return agendamentoRepo.listarPorUtilizador(utilizadorId);
  };
}