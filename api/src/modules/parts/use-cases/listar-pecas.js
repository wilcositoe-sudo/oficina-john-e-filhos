export function criarListarPecas({ pecaRepo }) {
  return async function listarPecas() {
    return pecaRepo.listarTodos();
  };
}