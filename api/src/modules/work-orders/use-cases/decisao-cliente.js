import { erros } from '../../../shared/errors/domain-error.js';
import { ESTADOS_OS, ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarDecisaoCliente({ osRepo, clienteRepo }) {
  return async function decisaoCliente({ ordemId, utilizador, acao, itensRemover }) {
    if (utilizador.perfil !== 'CLIENTE') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    // Verificar propriedade
    const cliente = await clienteRepo.procurarPorUtilizadorId(utilizador.id);
    if (!cliente || os.clienteId !== cliente.id) throw erros.naoAutorizado();

    if (os.estado !== ESTADOS_OS.AGUARDANDO_APROVACAO_CLIENTE) {
      throw erros.transicaoInvalida(os.estado);
    }

    switch (acao) {
      case 'aprovar': {
        const destino = ACOES_TRANSICAO.aprovar_cliente;
        if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
        await osRepo.atualizarEstado({ ordemId, estado: destino, utilizadorId: utilizador.id, motivo: 'Cliente aprovou o orçamento' });
        await osRepo.recalcularTotal(ordemId);
        return { mensagem: 'Orçamento aprovado. A reparação vai começar.' };
      }

      case 'modificar': {
        // Remove itens que o cliente não quer
        for (const item of (itensRemover ?? [])) {
          if (item.tipo === 'servico') await osRepo.removerLinhaServico({ linhaId: item.linhaId });
          if (item.tipo === 'peca') await osRepo.removerLinhaPeca({ linhaId: item.linhaId });
        }
        await osRepo.recalcularTotal(ordemId);
        const destino = ACOES_TRANSICAO.solicitar_revisao;
        if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
        await osRepo.atualizarEstado({ ordemId, estado: destino, utilizadorId: utilizador.id, motivo: 'Cliente removeu itens — aguarda validação' });
        return { mensagem: 'Revisão enviada. O funcionário vai validar os cortes.' };
      }

      case 'rejeitar': {
        const destino = ACOES_TRANSICAO.rejeitar;
        if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
        const resultado = await osRepo.rejeitarComCobrancaDiagnostico({ ordemId });
        if (!resultado) throw erros.transicaoInvalida(os.estado);
        return {
          mensagem: `Orçamento rejeitado. Taxa de diagnóstico de ${resultado.taxa_diagnostico} MZN foi aplicada.`,
          taxaCobrada: resultado.taxa_diagnostico,
        };
      }

      default:
        throw new erros.contaInternaInvalida('Ação inválida. Use: aprovar, modificar ou rejeitar.');
    }
  };
}