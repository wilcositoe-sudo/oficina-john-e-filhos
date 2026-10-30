import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { podeDecidir } from '../domain/estados.js';

// RF02: cliente aceita ou rejeita a proposta. Só o dono, só se ENVIADO.
export function criarDecidirOrcamento({ orcamentoRepo }) {
  return async function decidirOrcamento({ id, utilizador, decisao }) {
    if (!['APROVAR', 'REJEITAR'].includes(decisao)) {
      throw new DomainError('VALIDACAO', 'Campo inválido: decisao. Use APROVAR ou REJEITAR.', 422, { campo: 'decisao' });
    }

    const orc = await orcamentoRepo.procurarPorId(id);
    if (!orc) throw erros.orcamentoNaoEncontrado();
    if (orc.utilizadorId !== utilizador.id) throw erros.naoAutorizado();
    if (!podeDecidir(orc.estado)) throw erros.transicaoInvalida(orc.estado);

    const novoEstado = decisao === 'APROVAR' ? 'APROVADO' : 'REJEITADO';
    const atualizado = await orcamentoRepo.decidir({
      id,
      estado: novoEstado,
      aprovadoAt: decisao === 'APROVAR' ? new Date() : null,
    });
    if (!atualizado) throw erros.transicaoInvalida(orc.estado); // corrida: outro pedido decidiu primeiro
    return atualizado;
  };
}