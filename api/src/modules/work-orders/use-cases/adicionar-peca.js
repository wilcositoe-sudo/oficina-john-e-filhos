import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { podeEditar } from '../domain/estados.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF12: lança peça com débito atómico de stock (Doc 09 §9.6 — bloqueia se insuficiente, DEC-D05).
export function criarAdicionarPeca({ osRepo }) {
  return async function adicionarPeca({ ordemId, pecaId, quantidade }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (!podeEditar(os.estado)) throw erros.transicaoInvalida(os.estado);

    const qtd = Number(quantidade ?? 1);
    if (!Number.isInteger(qtd) || qtd < 1) throw erroValidacao('quantidade', 'Inteiro >= 1.');

    const resultado = await osRepo.adicionarPeca({ ordemId, pecaId, quantidade: qtd });
    return { ...resultado.linha, ordemId, valorTotal: resultado.valorTotal };
  };
}