export function criarListarOrcamentosCliente({ orcamentoRepo }) {
  return async function listarOrcamentosCliente({ utilizadorId }) {
    return orcamentoRepo.listarPorUtilizador(utilizadorId);
  };
}