import { erros } from '../../../shared/errors/domain-error.js';
import {
  ESTADOS_OS,
  ACOES_TRANSICAO,
  podeTransitar,
} from '../domain/estados.js';

export function criarDecisaoCliente({ osRepo, clienteRepo }) {
  return async function decisaoCliente({
    ordemId,
    utilizador,
    acao,
    itensRemover,
  }) {
    if (utilizador.perfil !== 'CLIENTE') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const cliente = await clienteRepo.procurarPorUtilizadorId(utilizador.id);
    if (!cliente || String(os.clienteId) !== String(cliente.id)) {
      throw erros.naoAutorizado();
    }

    if (os.estado !== ESTADOS_OS.AGUARDANDO_APROVACAO_CLIENTE) {
      throw erros.transicaoInvalida(os.estado);
    }

    switch (acao) {
      case 'aprovar': {
        const destino = ACOES_TRANSICAO.aprovar_cliente;

        if (!podeTransitar(os.estado, destino)) {
          throw erros.transicaoInvalida(os.estado);
        }

        const atualizada = await osRepo.atualizarEstado({
          ordemId,
          estadoAnterior: os.estado,
          estado: destino,
          utilizadorId: utilizador.id,
          motivo: 'Cliente aprovou o orçamento',
        });
        if (!atualizada) throw erros.transicaoInvalida(os.estado);

        await osRepo.recalcularTotal(ordemId);

        return {
          mensagem:
            'Orçamento aprovado. A OS foi enviada ao funcionário para atribuir o mecânico de reparação.',
        };
      }

      case 'modificar': {
        await osRepo.marcarItensParaRemocao({
          ordemId,
          itensRemover: itensRemover ?? [],
        });

        const destino =
          ACOES_TRANSICAO.modificar_cliente ??
          ACOES_TRANSICAO.solicitar_revisao;

        if (!podeTransitar(os.estado, destino)) {
          throw erros.transicaoInvalida(os.estado);
        }

        const atualizada = await osRepo.atualizarEstado({
          ordemId,
          estadoAnterior: os.estado,
          estado: destino,
          utilizadorId: utilizador.id,
          motivo: 'Cliente editou o orçamento; aguarda validação do funcionário',
        });
        if (!atualizada) throw erros.transicaoInvalida(os.estado);

        return {
          mensagem:
            'Edição enviada. O funcionário vai rever e aprovar ou rejeitar os itens marcados para remoção.',
        };
      }

      case 'rejeitar': {
        const destino = ACOES_TRANSICAO.rejeitar;

        if (!podeTransitar(os.estado, destino)) {
          throw erros.transicaoInvalida(os.estado);
        }

        const resultado = await osRepo.rejeitarComCobrancaDiagnostico({
          ordemId,
          estadoAnterior: os.estado,
          utilizadorId: utilizador.id,
        });

        if (!resultado) throw erros.transicaoInvalida(os.estado);

        return {
          mensagem: `Orçamento rejeitado. Taxa de diagnóstico de ${resultado.taxa_diagnostico} MZN foi aplicada.`,
          taxaCobrada: resultado.taxa_diagnostico,
        };
      }

      default:
        throw new Error('Ação inválida. Use: aprovar, modificar ou rejeitar.');
    }
  };
}