import { DomainError, erros } from '../../../shared/errors/domain-error.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF08: cliente avalia a sua OS entregue (DEC-D20). Uma avaliação por OS.
export function criarAvaliarOs({ avaliacaoRepo, osRepo, clienteRepo }) {
  return async function avaliarOs({ ordemId, utilizador, classificacao, comentario }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();

    if (os.estado !== 'ENTREGUE') throw erros.osNaoElegivelAvaliacao(os.estado);

    const nota = Number(classificacao);
    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
      throw erroValidacao('classificacao', 'Inteiro entre 1 e 5.');
    }
    const texto = comentario?.trim() || null;
    if (texto && texto.length > 1000) throw erroValidacao('comentario', 'Máximo 1000 caracteres.');

    const cliente = await clienteRepo.procurarPorUtilizadorId(utilizador.id);
    if (!cliente) throw erros.clienteNaoEncontrado();

    return avaliacaoRepo.criar({ ordemId, clienteId: cliente.id, classificacao: nota, comentario: texto });
  };
}