export function criarListarVeiculosCliente({ veiculoRepo }) {
  return async function listarVeiculosCliente({ utilizadorId }) {
    return veiculoRepo.listarPorUtilizador(utilizadorId);
  };
}