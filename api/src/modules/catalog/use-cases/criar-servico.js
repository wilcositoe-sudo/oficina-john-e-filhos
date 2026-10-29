import { DomainError } from '../../../shared/errors/domain-error.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

export function criarCriarServico({ servicoRepo }) {
  return async function criarServico({ codigo, nome, descricao, precoBase }) {
    const nomeTrim = nome?.trim() ?? '';
    if (nomeTrim.length < 2) throw erroValidacao('nome', 'Mínimo 2 caracteres.');

    const preco = Number(precoBase);
    if (!Number.isFinite(preco) || preco < 0) {
      throw erroValidacao('precoBase', 'Deve ser um número >= 0.');
    }

    return servicoRepo.criar({
      codigo: codigo?.trim() || null,
      nome: nomeTrim,
      descricao: descricao?.trim() || null,
      precoBase: preco.toFixed(2), // string decimal → NUMERIC exato (RN05)
    });
  };
}