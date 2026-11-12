import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

// RF04/RF21: cliente vê só as suas; staff vê todas.
export function criarDetalheOs({ osRepo }) {
  return async function detalheOs({ id, utilizador, isStaff }) {
    const os = await osRepo.procurarPorId(id);
    if (!os) throw erros.osNaoEncontrada();
    if (!isStaff && !mesmaId(os.utilizadorId, utilizador.id)) throw erros.naoAutorizado();
    return os;
  };
}