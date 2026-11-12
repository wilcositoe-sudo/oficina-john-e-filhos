import { DomainError } from '../../../shared/errors/domain-error.js';

export function criarModerarAvaliacoes({ avaliacaoRepo }) {
  return {
    listar: () => avaliacaoRepo.listarTodas(),
    async atualizarPublicacao({ id, publicada }) {
      if (typeof publicada !== 'boolean') {
        throw new DomainError(
          'VALIDACAO',
          'Campo "publicada" é obrigatório e deve ser booleano.',
          422,
        );
      }

      const resultado = await avaliacaoRepo.atualizarPublicacao({ id, publicada });
      if (!resultado) {
        throw new DomainError('NAO_ENCONTRADO', 'Avaliação não encontrada.', 404);
      }
      return resultado;
    },
  };
}
