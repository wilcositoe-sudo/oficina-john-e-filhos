import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { paraCentimos, deCentimos } from '../../quotes/domain/dinheiro.js';

const erroValidacao = (campo, mensagem) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${mensagem}`, 422, { campo });

export function criarAtualizarPeca({ pecaRepo }) {
  return async function atualizarPeca({ id, ...dados }) {
    const existente = await pecaRepo.procurarPorId(id);
    if (!existente) throw erros.pecaNaoEncontrada();

    const atualizado = {};
    if (Object.hasOwn(dados, 'nome')) {
      const nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
      if (nome.length < 2) throw erroValidacao('nome', 'Mínimo 2 caracteres.');
      atualizado.nome = nome;
    }
    if (Object.hasOwn(dados, 'descricao')) {
      if (dados.descricao !== null && typeof dados.descricao !== 'string') {
        throw erroValidacao('descricao', 'Deve ser texto ou nulo.');
      }
      atualizado.descricao = dados.descricao?.trim() || null;
    }
    if (Object.hasOwn(dados, 'precoUnitario')) {
      const preco = dados.precoUnitario === '' ? null : paraCentimos(dados.precoUnitario);
      if (preco === null) {
        throw erroValidacao('precoUnitario', 'Formato 0.00 (máx. 2 casas).');
      }
      atualizado.precoUnitario = deCentimos(preco);
    }
    if (Object.hasOwn(dados, 'quantidadeStock')) {
      const stock = Number(dados.quantidadeStock);
      if (dados.quantidadeStock === '' || !Number.isInteger(stock) || stock < 0) {
        throw erroValidacao('quantidadeStock', 'Inteiro >= 0.');
      }
      atualizado.quantidadeStock = stock;
    }
    if (Object.hasOwn(dados, 'ativo')) {
      if (typeof dados.ativo !== 'boolean') {
        throw erroValidacao('ativo', 'Deve ser booleano.');
      }
      atualizado.ativo = dados.ativo;
    }
    if (Object.keys(atualizado).length === 0) {
      throw erroValidacao('dados', 'Indique pelo menos um campo para atualizar.');
    }

    const resultado = await pecaRepo.atualizar({ id, ...atualizado });
    if (!resultado) throw erros.pecaNaoEncontrada();
    return resultado;
  };
}
