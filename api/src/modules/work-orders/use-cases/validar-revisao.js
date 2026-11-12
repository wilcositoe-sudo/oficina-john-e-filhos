import { erros } from '../../../shared/errors/domain-error.js';
import {
  ESTADOS_OS,
  ACOES_TRANSICAO,
  podeTransitar,
} from '../domain/estados.js';

export function criarValidarRevisao({ osRepo }) {
  return async function validarRevisao({
    ordemId,
    utilizador,
    aprovada,
  }) {
    if (!['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil)) {
      throw erros.naoAutorizado();
    }

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (os.estado !== ESTADOS_OS.AGUARDANDO_VALIDACAO_FUNCIONARIO) {
      throw erros.transicaoInvalida(os.estado);
    }

    if (typeof aprovada !== 'boolean') {
      throw new Error('Campo "aprovada" é obrigatório e deve ser booleano.');
    }

    if (aprovada) {
      await osRepo.aplicarRemocoesPendentes(ordemId);
      await osRepo.recalcularTotal(ordemId);

      const destino = ACOES_TRANSICAO.validar_edicao_aprovada;

      if (!podeTransitar(os.estado, destino)) {
        throw erros.transicaoInvalida(os.estado);
      }

      const atualizada = await osRepo.atualizarEstado({
        ordemId,
        estadoAnterior: os.estado,
        estado: destino,
        utilizadorId: utilizador.id,
        motivo: 'Funcionário aprovou a edição do cliente',
      });
      if (!atualizada) throw erros.transicaoInvalida(os.estado);

      return {
        mensagem:
          'Edição aprovada. Itens removidos. A OS aguarda atribuição de mecânico de reparação.',
      };
    }

    await osRepo.rejeitarRemocoesPendentes(ordemId);

    const destino = ACOES_TRANSICAO.validar_edicao_rejeitada;

    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const atualizada = await osRepo.atualizarEstado({
      ordemId,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Funcionário rejeitou a edição do cliente',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return {
      mensagem:
        'Edição rejeitada. A OS voltou ao cliente para decidir sobre a proposta original.',
    };
  };
}