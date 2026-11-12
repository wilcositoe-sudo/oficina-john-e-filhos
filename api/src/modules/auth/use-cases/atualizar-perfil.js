import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';
import { normalizarEmail, normalizarTelefone } from '../domain/validacoes.js';

const erroValidacao = (campo, mensagem) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${mensagem}`, 422, { campo });

export function criarAtualizarPerfil({ utilizadorRepo }) {
  return async function atualizarPerfil({ utilizador, ...dados }) {
    const camposPermitidos = ['nome', 'email', 'telefone'];
    if (!camposPermitidos.some((campo) => Object.hasOwn(dados, campo))) {
      throw erroValidacao('dados', 'Indique pelo menos um campo para atualizar.');
    }

    let nome = utilizador.nome;
    if (Object.hasOwn(dados, 'nome')) {
      nome = typeof dados.nome === 'string' ? dados.nome.trim() : '';
      if (nome.length < 2) throw erroValidacao('nome', 'Mínimo 2 caracteres.');
    }

    let email = utilizador.email;
    if (Object.hasOwn(dados, 'email')) {
      if (dados.email !== null && typeof dados.email !== 'string') {
        throw erroValidacao('email', 'Deve ser texto ou nulo.');
      }
      email = normalizarEmail(dados.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw erroValidacao('email', 'Formato inválido.');
      }
      if (email) {
        const existente = await utilizadorRepo.procurarPorEmail(email);
        if (existente && !mesmaId(existente.id, utilizador.id)) throw erros.emailEmUso();
      }
    }

    let telefone = utilizador.telefone;
    if (Object.hasOwn(dados, 'telefone')) {
      if (dados.telefone !== null && typeof dados.telefone !== 'string') {
        throw erroValidacao('telefone', 'Deve ser texto ou nulo.');
      }
      telefone = normalizarTelefone(dados.telefone);
      if (dados.telefone && !telefone) {
        throw erroValidacao('telefone', 'Indique pelo menos 9 dígitos.');
      }
      if (telefone) {
        const existente = await utilizadorRepo.procurarPorTelefone(telefone);
        if (existente && !mesmaId(existente.id, utilizador.id)) throw erros.telefoneEmUso();
      }
    }

    if (!email && !telefone) {
      throw erroValidacao('email/telefone', 'Mantenha pelo menos um contacto.');
    }

    const atualizado = await utilizadorRepo.atualizarPerfil({
      id: utilizador.id,
      nome,
      email,
      telefone,
    });
    if (!atualizado) throw erros.utilizadorNaoEncontrado();
    return atualizado;
  };
}
