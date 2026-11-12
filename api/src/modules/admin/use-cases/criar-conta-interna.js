import { erros } from '../../../shared/errors/domain-error.js';

const PERFIS_VALIDOS = ['FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO'];

export function criarCriarContaInterna({ utilizadorRepo, passwordHasher }) {
  return async function criarContaInterna({ nome, email, senha, perfil, utilizador }) {
    if (utilizador.perfil !== 'ADMINISTRADOR') throw erros.naoAutorizado();

    if (!PERFIS_VALIDOS.includes(perfil)) {
      throw erros.contaInternaInvalida(`Perfil tem de ser ${PERFIS_VALIDOS.join(', ')}.`);
    }

    const nomeLimpo = nome?.trim();
    if (!nomeLimpo || nomeLimpo.length < 2) {
      throw erros.contaInternaInvalida('Nome deve ter pelo menos 2 caracteres.');
    }

    const emailLimpo = email?.trim().toLowerCase();
    if (!emailLimpo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      throw erros.contaInternaInvalida('E-mail inválido.');
    }

    if (!senha || senha.length < 8) {
      throw erros.contaInternaInvalida('Senha deve ter pelo menos 8 caracteres.');
    }

    const existente = await utilizadorRepo.procurarPorEmail(emailLimpo);
    if (existente) throw erros.emailEmUso();

    const passwordHash = await passwordHasher.hash(senha);
    const criado = await utilizadorRepo.criar({
      nome: nomeLimpo,
      email: emailLimpo,
      telefone: null,
      passwordHash,
      perfil,
    });

    return { id: criado.id, nome: criado.nome, email: criado.email, perfil: criado.perfil };
  };
}