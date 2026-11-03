import { erros } from '../../../shared/errors/domain-error.js';

const PERFIS_INTERNOS = ['FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO']; // 🆕

export function criarAtualizarContaInterna({ utilizadorRepo }) {
  return async function atualizarContaInterna({ id, nome, ativo, utilizador }) {
    if (utilizador.perfil !== 'ADMINISTRADOR') throw erros.naoAutorizado();

    const alvo = await utilizadorRepo.procurarPorId(id);
    if (!alvo) throw erros.utilizadorNaoEncontrado();
    if (!PERFIS_INTERNOS.includes(alvo.perfil)) {
      throw erros.contaInternaInvalida('Só é possível gerir contas internas (Funcionário, Mecânico ou Administrador).');
    }

    // Proteger o último administrador ativo
    if (ativo === false && alvo.perfil === 'ADMINISTRADOR') {
      const outros = await utilizadorRepo.contarAdminsAtivos(id);
      if (outros === 0) throw erros.ultimoAdminAtivo();
    }

    const atualizado = await utilizadorRepo.atualizarContaInterna({ id, nome, ativo });
    return atualizado;
  };
}