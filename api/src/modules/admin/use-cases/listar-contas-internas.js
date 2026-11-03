export function criarListarContasInternas({ utilizadorRepo }) {
  return async function listarContasInternas() {
    return utilizadorRepo.listarInternos();
  };
}