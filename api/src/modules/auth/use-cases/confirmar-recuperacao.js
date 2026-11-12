import crypto from 'node:crypto';
import { DomainError, erros } from '../../../shared/errors/domain-error.js';

export function criarConfirmarRecuperacao({ utilizadorRepo, passwordHasher }) {
  return async function confirmarRecuperacao({ token, novaSenha }) {
    if (typeof novaSenha !== 'string' || novaSenha.length < 8) {
      throw new DomainError('VALIDACAO', 'A nova senha deve ter no mínimo 8 caracteres.', 422);
    }
    if (typeof token !== 'string' || !token) throw erros.credenciaisInvalidas();

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const utilizador = await utilizadorRepo.procurarPorTokenRecuperacao(tokenHash);
    if (!utilizador) throw erros.credenciaisInvalidas(); // Mensagem genérica por segurança

    const expiraEm = new Date(utilizador.resetTokenExpiresAt).getTime();
    if (!Number.isFinite(expiraEm) || Date.now() >= expiraEm) {
      throw new DomainError('TOKEN_EXPIRADO', 'O link de recuperação expirou. Solicite um novo.', 400);
    }

    const passwordHash = await passwordHasher.hash(novaSenha);
    await utilizadorRepo.atualizarSenhaEInvalidarToken(utilizador.id, passwordHash);

    return { mensagem: 'Senha redefinida com sucesso. Pode agora fazer login.' };
  };
}