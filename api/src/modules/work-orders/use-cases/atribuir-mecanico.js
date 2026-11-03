import { erros } from '../../../shared/errors/domain-error.js';
import { ESTADOS_OS, podeTransitar } from '../domain/estados.js';

export function criarAtribuirMecanico({ osRepo, utilizadorRepo }) {
  return async function atribuirMecanico({ ordemId, mecanicoId, utilizador }) {
    if (utilizador.perfil !== 'FUNCIONARIO' && utilizador.perfil !== 'ADMINISTRADOR') {
      throw erros.naoAutorizado();
    }

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (os.estado !== ESTADOS_OS.PENDENTE && os.estado !== ESTADOS_OS.EM_DIAGNOSTICO) {
      throw erros.transicaoInvalida(os.estado);
    }

    const mecanico = await utilizadorRepo.procurarPorId(mecanicoId);
    if (!mecanico || mecanico.perfil !== 'MECANICO' || !mecanico.ativo) {
      throw erros.utilizadorNaoEncontrado();
    }

    const resultado = await osRepo.atribuirMecanico({ ordemId, mecanicoId });
    return { os: resultado, mensagem: `OS atribuída ao mecânico ${mecanico.nome}.` };
  };
}