import { erros } from '../../../shared/errors/domain-error.js';

export function criarAtualizarContaInterna({ utilizadorRepo }) {
  return async function atualizarContaInterna({ id, nome, ativo }) {
    const conta = await utilizadorRepo.procurarPorId(id);
    if (!conta || !['FUNCIONARIO', 'ADMINISTRADOR'].includes(conta.perfil)) {
      throw erros.utilizadorNaoEncontrado();
    }
    if (ativo === false && conta.perfil === 'ADMINISTRADOR') {
      const outrosAdmins = await utilizadorRepo.contarAdminsAtivos(id);
      if (outrosAdmins === 0) throw erros.ultimoAdminAtivo();
    }
    return utilizadorRepo.atualizarContaInterna({ id, nome: nome?.trim() || null, ativo });
  };
}