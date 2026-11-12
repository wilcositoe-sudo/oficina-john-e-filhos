import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

// RF05: histórico só para participantes.
export function criarListarMensagens({ mensagemRepo, osRepo }) {
  return async function listarMensagens({ ordemId, utilizador }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    const isMecanicoResponsavel = utilizador.perfil === 'MECANICO'
      && mesmaId(os.mecanicoId, utilizador.id);
    if (!isStaff && !isMecanicoResponsavel && !mesmaId(os.utilizadorId, utilizador.id)) {
      throw erros.naoAutorizado();
    }

    await mensagemRepo.marcarLidas({ ordemId, utilizadorId: utilizador.id });
    return mensagemRepo.listarPorOrdem(ordemId);
  };
}