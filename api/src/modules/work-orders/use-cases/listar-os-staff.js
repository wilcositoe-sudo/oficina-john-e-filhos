export function criarListarOsStaff({ osRepo }) {
  return async function listarOsStaff() {
    return osRepo.listarTodos();
  };
}