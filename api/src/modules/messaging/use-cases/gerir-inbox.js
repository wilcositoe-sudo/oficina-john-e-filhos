import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

const PERFIS_STAFF = new Set(['FUNCIONARIO', 'ADMINISTRADOR']);

export function criarListarConversasOs({ mensagemRepo }) {
  return async function listarConversasOs({ utilizador }) {
    if (!['CLIENTE', 'MECANICO', ...PERFIS_STAFF].includes(utilizador.perfil)) {
      throw erros.naoAutorizado();
    }
    return mensagemRepo.listarConversas({ utilizador });
  };
}

export function criarOcultarConversaOs({ mensagemRepo, osRepo }) {
  return async function ocultarConversaOs({ ordemId, utilizador }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const autorizado = PERFIS_STAFF.has(utilizador.perfil)
      || (utilizador.perfil === 'MECANICO' && mesmaId(os.mecanicoId, utilizador.id))
      || (utilizador.perfil === 'CLIENTE' && mesmaId(os.utilizadorId, utilizador.id));
    if (!autorizado) throw erros.naoAutorizado();

    await mensagemRepo.ocultarConversa({ ordemId, utilizadorId: utilizador.id });
  };
}
