import { erros } from '../../../shared/errors/domain-error.js';

export function criarListarContasInternas({ utilizadorRepo }) {
  return async function listarContasInternas({ utilizador }) {
    if (utilizador.perfil !== 'ADMINISTRADOR') throw erros.naoAutorizado();
    return utilizadorRepo.listarInternos();
  };
}