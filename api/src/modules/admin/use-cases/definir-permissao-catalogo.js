import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

export function criarDefinirPermissaoCatalogo({ utilizadorRepo }) {
  return async function definirPermissaoCatalogo({ id, pode, utilizador }) {
    if (typeof pode !== 'boolean') {
      throw new DomainError(
        'VALIDACAO',
        'Campo "podeGerirCatalogo" é obrigatório e deve ser booleano.',
        422,
      );
    }
    if (mesmaId(id, utilizador.id) && !pode) {
      throw new DomainError(
        'NAO_PODE_REVOGAR_PROPRIA_PERMISSAO',
        'Não podes remover a tua própria permissão de catálogo.',
        400,
      );
    }

    const resultado = await utilizadorRepo.definirPermissaoCatalogo({ id, pode });
    if (!resultado) throw erros.utilizadorNaoEncontrado();
    return resultado;
  };
}
