import { DomainError, erros } from '../../../shared/errors/domain-error.js';

const erroValidacao = (campo, mensagem) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${mensagem}`, 422, { campo });

export function criarAtualizarServico({ servicoRepo }) {
  return async function atualizarServico({ id, ...dados }) {
    const existente = await servicoRepo.procurarPorId(id);
    if (!existente) throw erros.servicoNaoEncontrado();

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
    if (Object.hasOwn(dados, 'precoBase')) {
      const preco = Number(dados.precoBase);
      if (dados.precoBase == null || dados.precoBase === '' || !Number.isFinite(preco) || preco < 0) {
        throw erroValidacao('precoBase', 'Deve ser um número >= 0.');
      }
      atualizado.precoBase = preco.toFixed(2);
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

    const resultado = await servicoRepo.atualizar({ id, ...atualizado });
    if (!resultado) throw erros.servicoNaoEncontrado();
    return resultado;
  };
}
