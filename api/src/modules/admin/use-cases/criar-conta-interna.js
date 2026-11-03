import { erros } from '../../../shared/errors/domain-error.js';
import { passwordHasher } from '../../auth/domain/password-hasher.js';

export function criarCriarContaInterna({ utilizadorRepo }) {
  return async function criarContaInterna({ nome, email, senha, perfil }) {
    const nomeTrim = nome?.trim() ?? '';
    if (nomeTrim.length < 2) throw erros.contaInternaInvalida('Nome: mínimo 2 caracteres.');
    
    const emailNorm = email?.trim().toLowerCase() ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      throw erros.contaInternaInvalida('E-mail inválido.');
    }
    
    if (!['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil)) {
      throw erros.contaInternaInvalida('Perfil tem de ser FUNCIONARIO ou ADMINISTRADOR.');
    }
    
    if (typeof senha !== 'string' || senha.length < 8) {
      throw erros.contaInternaInvalida('Senha: mínimo 8 caracteres.');
    }
    
    if (await utilizadorRepo.procurarPorEmail(emailNorm)) throw erros.emailEmUso();
    
    const passwordHash = await passwordHasher.hash(senha);
    return utilizadorRepo.criar({
      nome: nomeTrim,
      email: emailNorm,
      telefone: null,
      passwordHash,
      perfil,
    });
  };
}