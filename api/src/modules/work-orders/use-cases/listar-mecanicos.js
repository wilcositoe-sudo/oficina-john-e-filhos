export function criarListarMecanicos({ utilizadorRepo }) {
  return function listarMecanicos() {
    return utilizadorRepo.listarPorPerfil('MECANICO');
  };
}
