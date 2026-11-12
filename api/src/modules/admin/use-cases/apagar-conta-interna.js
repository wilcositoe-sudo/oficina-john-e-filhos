import { DomainError, erros } from '../../../shared/errors/domain-error.js';

const PERFIS_INTERNOS = new Set(['FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO']);

export function criarApagarContaInterna({ utilizadorRepo }) {
  return async function apagarContaInterna({ id, utilizador }) {
    if (utilizador.perfil !== 'ADMINISTRADOR') throw erros.naoAutorizado();
    if (String(id) === String(utilizador.id)) {
      throw new DomainError(
        'CONTA_PROPRIA',
        'Não podes apagar a tua própria conta.',
        409,
      );
    }

    const alvo = await utilizadorRepo.procurarPorId(id);
    if (!alvo) throw erros.utilizadorNaoEncontrado();
    if (!PERFIS_INTERNOS.has(alvo.perfil)) {
      throw erros.contaInternaInvalida(
        'Só é possível apagar contas internas (Funcionário, Mecânico ou Administrador).',
      );
    }

    if (
      alvo.perfil === 'ADMINISTRADOR' &&
      await utilizadorRepo.contarAdminsAtivos(id) === 0
    ) {
      throw erros.ultimoAdminAtivo();
    }

    try {
      const apagada = await utilizadorRepo.apagarContaInterna(id);
      if (!apagada) throw erros.utilizadorNaoEncontrado();
    } catch (error) {
      if (error.code === '23503') {
        throw new DomainError(
          'CONTA_COM_HISTORICO',
          'Esta conta tem registos associados e não pode ser apagada. Desativa-a para preservar o histórico.',
          409,
        );
      }
      throw error;
    }
  };
}
