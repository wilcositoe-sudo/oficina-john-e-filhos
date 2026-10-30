import { erros } from '../../../shared/errors/domain-error.js';

// RF05: histórico só para participantes.
export function criarListarMensagens({ mensagemRepo, osRepo }) {
  return async function listarMensagens({ ordemId, utilizador }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();

    return mensagemRepo.listarPorOrdem(ordemId);
  };
}