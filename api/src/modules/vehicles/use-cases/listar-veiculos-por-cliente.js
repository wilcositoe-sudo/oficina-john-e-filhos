import { erros } from '../../../shared/errors/domain-error.js';

export function criarListarVeiculosPorCliente({ utilizadorRepo, veiculoRepo }) {
  return async function listarVeiculosPorCliente({ email }) {
    const utilizador = await utilizadorRepo.procurarPorEmail(email.trim().toLowerCase());
    if (!utilizador || utilizador.perfil !== 'CLIENTE') {
      throw erros.clienteNaoEncontrado();
    }
    return veiculoRepo.listarPorUtilizador(utilizador.id);
  };
}
