// RF01: catálogo público — apenas serviços ativos, sem dados internos.
export function criarListarServicosPublico({ servicoRepo }) {
  return async function listarServicosPublico() {
    return servicoRepo.listarAtivos();
  };
}