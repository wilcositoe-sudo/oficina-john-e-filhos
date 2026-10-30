import { DomainError } from '../../../shared/errors/domain-error.js';
import { paraCentimos, deCentimos } from '../../quotes/domain/dinheiro.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

export function criarCriarPeca({ pecaRepo }) {
  return async function criarPeca({ codigo, nome, descricao, precoUnitario, quantidadeStock }) {
    const nomeTrim = nome?.trim() ?? '';
    if (nomeTrim.length < 2) throw erroValidacao('nome', 'Mínimo 2 caracteres.');

    const precoC = paraCentimos(precoUnitario);
    if (precoC === null) throw erroValidacao('precoUnitario', 'Formato 0.00 (máx. 2 casas).');

    const stock = Number(quantidadeStock ?? 0);
    if (!Number.isInteger(stock) || stock < 0) throw erroValidacao('quantidadeStock', 'Inteiro >= 0.');

    return pecaRepo.criar({
      codigo: codigo?.trim() || null,
      nome: nomeTrim,
      descricao: descricao?.trim() || null,
      precoUnitario: deCentimos(precoC),
      quantidadeStock: stock,
    });
  };
}