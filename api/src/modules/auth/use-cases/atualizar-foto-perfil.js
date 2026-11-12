import { DomainError, erros } from '../../../shared/errors/domain-error.js';

export function criarAtualizarFotoPerfil({ utilizadorRepo }) {
  return async function atualizarFotoPerfil({ utilizador, fotoPerfilUrl }) {
    if (
      fotoPerfilUrl !== null &&
      (typeof fotoPerfilUrl !== 'string' ||
        !/^\/uploads\/perfis\/[a-f0-9-]+\.(?:jpg|png|webp)$/.test(fotoPerfilUrl))
    ) {
      throw new DomainError(
        'VALIDACAO',
        'A fotografia de perfil não é válida.',
        422,
        { campo: 'fotoPerfilUrl' },
      );
    }

    const atualizado = await utilizadorRepo.atualizarFotoPerfil({
      id: utilizador.id,
      fotoPerfilUrl,
    });
    if (!atualizado) throw erros.utilizadorNaoEncontrado();
    return atualizado;
  };
}
