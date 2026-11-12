export function criarListarOsMecanico({ osRepo }) {
  return function listarOsMecanico({ utilizadorId }) {
    return osRepo.listarPorMecanico(utilizadorId);
  };
}
