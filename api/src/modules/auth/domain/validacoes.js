import { DomainError } from '../../../shared/errors/domain-error.js';

const ERRO_VALIDACAO = (campo, mensagem) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${mensagem}`, 422, { campo });

export function normalizarEmail(email) {
  const e = email?.trim().toLowerCase();
  return e ? e : null;
}

export function normalizarTelefone(telefone) {
  const digitos = telefone?.replace(/\D/g, '') ?? '';
  return digitos.length >= 9 ? digitos : null;
}

export function validarDadosRegisto({ nome, email, telefone, senha }) {
  const nomeTrim = nome?.trim() ?? '';
  if (nomeTrim.length < 2) throw ERRO_VALIDACAO('nome', 'Mínimo 2 caracteres.');

  const emailNorm = normalizarEmail(email);
  const telNorm = normalizarTelefone(telefone);
  if (!emailNorm && !telNorm) {
    throw ERRO_VALIDACAO('email/telefone', 'Indique pelo menos um contacto válido.');
  }
  if (emailNorm && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
    throw ERRO_VALIDACAO('email', 'Formato inválido.');
  }

  if (typeof senha !== 'string' || senha.length < 8) {
    throw ERRO_VALIDACAO('senha', 'Mínimo 8 caracteres.');
  }

  return { nome: nomeTrim, email: emailNorm, telefone: telNorm };
}