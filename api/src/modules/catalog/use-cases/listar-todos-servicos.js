// Staff vê ativos e inativos (UI19). O público continua a ver só ativos (RF01).
export function criarListarTodosServicos({ servicoRepo }) {
  return async function listarTodosServicos() {
    return servicoRepo.listarTodos();
  };
}