import { erros } from '../../../shared/errors/domain-error.js';
import { passwordHasher } from '../domain/password-hasher.js';

export function criarConfirmarRecuperacao({ utilizadorRepo }) {
  return async function confirmarRecuperacao({ token, novaSenha }) {
    if (typeof novaSenha !== 'string' || novaSenha.length < 8) {
      throw new Error('VALIDACAO', 'A nova senha deve ter no mínimo 8 caracteres.', 422);
    }

    const utilizador = await utilizadorRepo.procurarPorTokenRecuperacao(token);
    if (!utilizador) throw erros.credenciaisInvalidas(); // Mensagem genérica por segurança

    if (new Date() > new Date(utilizador.resetTokenExpiresAt)) {
      throw new Error('TOKEN_EXPIRADO', 'O link de recuperação expirou. Solicite um novo.', 400);
    }

    const passwordHash = await passwordHasher.hash(novaSenha);
    await utilizadorRepo.atualizarSenhaEInvalidarToken(utilizador.id, passwordHash);

    return { mensagem: 'Senha redefinida com sucesso. Pode agora fazer login.' };
  };
}