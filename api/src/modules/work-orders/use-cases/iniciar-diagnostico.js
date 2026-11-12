import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';
import { ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarIniciarDiagnostico({ osRepo }) {
  return async function iniciarDiagnostico({ ordemId, utilizador }) {
    if (utilizador.perfil !== 'MECANICO') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (!mesmaId(os.mecanicoId, utilizador.id)) throw erros.naoAutorizado();

    const destino = ACOES_TRANSICAO.iniciar_diagnostico;
    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const atualizada = await osRepo.atualizarEstado({
      ordemId,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Mecânico iniciou o diagnóstico',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return osRepo.procurarPorId(ordemId);
  };
}