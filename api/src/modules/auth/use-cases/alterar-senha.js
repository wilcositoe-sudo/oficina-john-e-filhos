import { DomainError, erros } from '../../../shared/errors/domain-error.js';

export function criarAlterarSenha({ utilizadorRepo, sessaoRepo, passwordHasher }) {
  return async function alterarSenha({ utilizador, senhaAtual, novaSenha }) {
    if (typeof senhaAtual !== 'string' || !senhaAtual) {
      throw new DomainError('VALIDACAO', 'Indique a palavra-passe atual.', 422, {
        campo: 'senhaAtual',
      });
    }
    if (typeof novaSenha !== 'string' || novaSenha.length < 8) {
      throw new DomainError('VALIDACAO', 'A nova palavra-passe deve ter pelo menos 8 caracteres.', 422, {
        campo: 'novaSenha',
      });
    }

    const credenciais = await utilizadorRepo.procurarCredenciaisPorId(utilizador.id);
    if (!credenciais || !await passwordHasher.comparar(senhaAtual, credenciais.password_hash)) {
      throw erros.credenciaisInvalidas();
    }
    if (await passwordHasher.comparar(novaSenha, credenciais.password_hash)) {
      throw new DomainError('VALIDACAO', 'A nova palavra-passe deve ser diferente da atual.', 422, {
        campo: 'novaSenha',
      });
    }

    const passwordHash = await passwordHasher.hash(novaSenha);
    await sessaoRepo.revogarTodas(utilizador.id);
    await utilizadorRepo.atualizarSenha(utilizador.id, passwordHash);
  };
}
