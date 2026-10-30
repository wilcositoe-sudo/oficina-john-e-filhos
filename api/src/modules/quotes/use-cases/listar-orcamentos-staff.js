export function criarListarOrcamentosStaff({ orcamentoRepo }) {
  return async function listarOrcamentosStaff() {
    return orcamentoRepo.listarTodos();
  };
}