export function criarListarLinhasOs({ osRepo }) {
  return function listarLinhasOs({ ordemId }) {
    return osRepo.listarLinhas(ordemId);
  };
}
