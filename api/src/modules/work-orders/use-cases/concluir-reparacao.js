import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';
import { ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarConcluirReparacao({ osRepo }) {
  return async function concluirReparacao({ ordemId, utilizador }) {
    if (utilizador.perfil !== 'MECANICO') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (!mesmaId(os.mecanicoId, utilizador.id)) throw erros.naoAutorizado();

    const destino = ACOES_TRANSICAO.concluir;
    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const nServicos = await osRepo.contarServicos(ordemId);
    if (nServicos === 0) throw erros.rn04SemServico();

    const atualizada = await osRepo.atualizarEstado({
      ordemId,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Mecânico validou a conclusão técnica da reparação',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return atualizada;
  };
}