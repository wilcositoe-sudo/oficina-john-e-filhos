import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

export function criarListarPagamentos({ pagamentoRepo, osRepo }) {
  return async function listarPagamentos({ ordemId, utilizador }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && !mesmaId(os.utilizadorId, utilizador.id)) throw erros.naoAutorizado();
    return pagamentoRepo.listarPorOrdem(ordemId);
  };
}