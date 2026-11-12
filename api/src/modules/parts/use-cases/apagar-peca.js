import { erros } from '../../../shared/errors/domain-error.js';

export function criarApagarPeca({ pecaRepo }) {
  return async function apagarPeca(id) {
    const apagada = await pecaRepo.apagar(id);
    if (!apagada) throw erros.pecaNaoEncontrada();
  };
}
