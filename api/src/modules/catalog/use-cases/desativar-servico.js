import { erros } from '../../../shared/errors/domain-error.js';

export function criarDesativarServico({ servicoRepo }) {
  return async function desativarServico(id) {
    const existente = await servicoRepo.procurarPorId(id);
    if (!existente) throw erros.servicoNaoEncontrado();
    return servicoRepo.desativar(id);
  };
}