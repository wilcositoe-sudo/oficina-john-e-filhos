export function criarListarMinhasOs({ osRepo }) {
  return async function listarMinhasOs({ utilizadorId }) {
    return osRepo.listarPorUtilizador(utilizadorId);
  };
}