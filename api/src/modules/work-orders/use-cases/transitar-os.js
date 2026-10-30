import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

// RN03: transição só por ação de domínio; histórico na mesma transação; UPDATE condicional anti-corrida.
// RN04: concluir exige pelo menos um serviço lançado.
export function criarTransitarOs({ osRepo }) {
  return async function transitarOs({ id, acao, utilizador, motivo }) {
    const destino = ACOES_TRANSICAO[acao];
    if (!destino) {
      throw new DomainError('VALIDACAO', `Campo inválido: acao. Use uma de: ${Object.keys(ACOES_TRANSICAO).join(', ')}.`, 422, { campo: 'acao' });
    }

    const os = await osRepo.procurarPorId(id);
    if (!os) throw erros.osNaoEncontrada();
    if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);

    if (destino === 'CONCLUIDA') {
      const nServicos = await osRepo.contarServicos(id);
      if (nServicos === 0) throw erros.rn04SemServico();
    }

    const atualizada = await osRepo.transitar({
      ordemId: id,
      estadoAnterior: os.estado,
      estadoNovo: destino,
      utilizadorId: utilizador.id,
      motivo: motivo?.trim() || null,
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado); // corrida: outro pedido transiti primeiro
    return atualizada;
  };
}