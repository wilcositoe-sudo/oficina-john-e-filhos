// RF09: catálogo de opiniões — público, sem dados privados do autor.
export function criarListarAvaliacoesPublicas({ avaliacaoRepo }) {
  return async function listarAvaliacoesPublicas() {
    return avaliacaoRepo.listarPublicas();
  };
}