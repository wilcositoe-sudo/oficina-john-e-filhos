import crypto from 'node:crypto';
import { normalizarEmail, normalizarTelefone } from '../domain/validacoes.js';
import { erros } from '../../../shared/errors/domain-error.js';

const SESSAO_DURACAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias (proposta DEC-D03, a validar)

// RF19: autenticação. Credenciais inválidas → erro genérico idêntico em todos os casos.
export function criarLogin({ utilizadorRepo, sessaoRepo, passwordHasher }) {
  return async function login({ identificador, senha }) {
    if (!identificador || !senha) throw erros.credenciaisInvalidas();

    const email = normalizarEmail(identificador);
    const telefone = normalizarTelefone(identificador);
    const utilizador = email
      ? await utilizadorRepo.procurarPorEmail(email)
      : await utilizadorRepo.procurarPorTelefone(telefone);

    // Mensagem única: não distingue "não existe" de "senha errada" (RF19)
    if (!utilizador || !utilizador.ativo) throw erros.credenciaisInvalidas();

    const senhaOk = await passwordHasher.comparar(senha, utilizador.password_hash);
    if (!senhaOk) throw erros.credenciaisInvalidas();

    const token = crypto.randomBytes(32).toString('hex');
    const expiraAt = new Date(Date.now() + SESSAO_DURACAO_MS);
    await sessaoRepo.criar({ token, utilizadorId: utilizador.id, expiraAt });

    return {
      token,
      expiraAt: expiraAt.toISOString(),
      utilizador: {
        id: utilizador.id,
        nome: utilizador.nome,
        email: utilizador.email,
        telefone: utilizador.telefone,
        perfil: utilizador.perfil,
      },
    };
  };
}