import { erros } from '../../../shared/errors/domain-error.js';

export function criarListarHistoricoOs({ osRepo }) {
  return async function listarHistoricoOs({ id, utilizador, isStaff }) {
    const os = await osRepo.procurarPorId(id);
    if (!os) throw erros.osNaoEncontrada();
    if (!isStaff && os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();
    return osRepo.listarHistorico(id);
  };
}