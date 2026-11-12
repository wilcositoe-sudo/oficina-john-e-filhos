import { erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

export function criarDetalheVeiculo({ veiculoRepo }) {
  return async function detalheVeiculo({ id, utilizador, isStaff }) {
    const veiculo = await veiculoRepo.procurarPorId(id);
    if (!veiculo) throw erros.veiculoNaoEncontrado();
    if (!isStaff && !mesmaId(veiculo.utilizadorId, utilizador.id)) throw erros.naoAutorizado();
    return veiculo;
  };
}