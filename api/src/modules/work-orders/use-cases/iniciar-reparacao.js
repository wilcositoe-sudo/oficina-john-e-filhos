import { erros } from '../../../shared/errors/domain-error.js';
import {
  ESTADOS_OS,
  ACOES_TRANSICAO,
  podeTransitar,
} from '../domain/estados.js';

export function criarIniciarReparacao({ osRepo }) {
  return async function iniciarReparacao({ ordemId, utilizador }) {
    if (utilizador.perfil !== 'MECANICO') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (String(os.mecanicoId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    const estadosPermitidos = new Set([
      ESTADOS_OS.AGUARDANDO_REPARACAO,
      ESTADOS_OS.AGUARDANDO_PECAS,
    ]);

    if (!estadosPermitidos.has(os.estado)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const destino = ACOES_TRANSICAO.iniciar_reparacao;

    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const atualizada = await osRepo.atualizarEstado({
      ordemId,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Mecânico iniciou a reparação',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return {
      mensagem: 'Reparação iniciada.',
    };
  };
}