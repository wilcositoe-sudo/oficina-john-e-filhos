import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF11/RN09/RN01/RN02: staff cria a OS. O estado inicial é sempre PENDENTE (servidor).
export function criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo }) {
  return async function criarOS({ utilizador, emailCliente, veiculoId, descricaoProblema, orcamentoId }) {
    if (!['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador?.perfil)) {
      throw erros.naoAutorizado();
    }

    const desc = descricaoProblema?.trim() ?? '';
    if (desc.length < 10) throw erroValidacao('descricaoProblema', 'Mínimo 10 caracteres.');

    const email = emailCliente?.trim().toLowerCase();
    if (!email) throw erroValidacao('emailCliente', 'Indique o e-mail do cliente.');

    const clienteUtilizador = await utilizadorRepo.procurarPorEmail(email);
    if (!clienteUtilizador || clienteUtilizador.perfil !== 'CLIENTE' || !clienteUtilizador.ativo) {
      throw erros.clienteNaoEncontrado();
    }
    const cliente = await clienteRepo.procurarPorUtilizadorId(clienteUtilizador.id);
    if (!cliente) throw erros.clienteNaoEncontrado();

    const veiculo = veiculoId ? await veiculoRepo.procurarPorId(veiculoId) : null;
    if (!veiculo || !mesmaId(veiculo.utilizadorId, clienteUtilizador.id)) {
      throw new DomainError('VEICULO_INVALIDO', 'O veículo não pertence a este cliente.', 422, { campo: 'veiculoId' });
    }

    return osRepo.criar({
      clienteId: cliente.id,
      veiculoId,
      funcionarioId: utilizador.id,
      descricaoProblema: desc,
      orcamentoId: orcamentoId ?? null,
    });
  };
}