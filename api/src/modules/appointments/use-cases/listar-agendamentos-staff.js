export function criarListarAgendamentosStaff({ agendamentoRepo }) {
  return async function listarAgendamentosStaff() {
    return agendamentoRepo.listarTodos();
  };
}