import { erros } from '../../../shared/errors/domain-error.js';

export function criarApagarServico({ servicoRepo }) {
  return async function apagarServico(id) {
    const apagado = await servicoRepo.apagar(id);
    if (!apagado) throw erros.servicoNaoEncontrado();
  };
}
