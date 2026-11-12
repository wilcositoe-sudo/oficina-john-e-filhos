export function criarListarMinhasOs({ osRepo }) {
  return async function listarMinhasOs({ utilizador, utilizadorId } = {}) {
    // Aceita quer { utilizadorId } quer { utilizador } (defesa em profundidade
    // contra o mismatch rota↔use-case que devolvia 0 linhas).
    const id = utilizadorId ?? utilizador?.id;

    if (id == null || id === '') {
      return [];
    }

    return osRepo.listarPorUtilizador(id);
  };
}