import { DomainError, erros } from '../../../shared/errors/domain-error.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF11/RN09/RN01/RN02: staff cria a OS. O estado inicial é sempre PENDENTE (servidor).
export function criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo }) {
  return async function criarOS({ funcionarioId, emailCliente, veiculoId, descricaoProblema, orcamentoId }) {
    const desc = descricaoProblema?.trim() ?? '';
    if (desc.length < 10) throw erroValidacao('descricaoProblema', 'Mínimo 10 caracteres.');

    const email = emailCliente?.trim().toLowerCase();
    if (!email) throw erroValidacao('emailCliente', 'Indique o e-mail do cliente.');

    const utilizador = await utilizadorRepo.procurarPorEmail(email);
    if (!utilizador || utilizador.perfil !== 'CLIENTE' || !utilizador.ativo) {
      throw erros.clienteNaoEncontrado();
    }
    const cliente = await clienteRepo.procurarPorUtilizadorId(utilizador.id);
    if (!cliente) throw erros.clienteNaoEncontrado();

    const veiculo = veiculoId ? await veiculoRepo.procurarPorId(veiculoId) : null;
    if (!veiculo || veiculo.utilizadorId !== utilizador.id) {
      throw new DomainError('VEICULO_INVALIDO', 'O veículo não pertence a este cliente.', 422, { campo: 'veiculoId' });
    }

    return osRepo.criar({
      clienteId: cliente.id,
      veiculoId,
      funcionarioId,
      descricaoProblema: desc,
      orcamentoId: orcamentoId ?? null,
    });
  };
}