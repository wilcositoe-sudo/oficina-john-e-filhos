import { erros } from '../../../shared/errors/domain-error.js';

export function criarDetalheVeiculo({ veiculoRepo }) {
  return async function detalheVeiculo({ id, utilizador, isStaff }) {
    const veiculo = await veiculoRepo.procurarPorId(id);
    if (!veiculo) throw erros.veiculoNaoEncontrado();
    if (!isStaff && veiculo.utilizadorId !== utilizador.id) throw erros.naoAutorizado();
    return veiculo;
  };
}