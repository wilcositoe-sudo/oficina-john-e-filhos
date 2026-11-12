import { DomainError } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF02: cliente pede orçamento. RN01: o veículo TEM de ser dele. RN09: descrição >= 10.
export function criarSolicitarOrcamento({ orcamentoRepo, veiculoRepo }) {
  return async function solicitarOrcamento({ utilizadorId, veiculoId, descricaoProblema }) {
    const desc = descricaoProblema?.trim() ?? '';
    if (desc.length < 10) throw erroValidacao('descricaoProblema', 'Mínimo 10 caracteres.');

    const veiculo = veiculoId ? await veiculoRepo.procurarPorId(veiculoId) : null;
    if (!veiculo || !mesmaId(veiculo.utilizadorId, utilizadorId)) {
      throw new DomainError('VEICULO_INVALIDO', 'Selecione um veículo seu para o orçamento.', 422, { campo: 'veiculoId' });
    }

    const criado = await orcamentoRepo.criar({ utilizadorId, veiculoId, descricaoProblema: desc });
    if (!criado) throw new DomainError('CLIENTE_INVALIDO', 'Perfil de cliente inexistente.', 422);
    return criado;
  };
}