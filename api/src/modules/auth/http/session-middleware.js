import { erros } from '../../../shared/errors/domain-error.js';

// Autenticação por token Bearer (DEC-D05). Autorização por papel fica na F4+ (RBAC).
export function createRequireAuth({ sessaoRepo, utilizadorRepo }) {
  return async function requireAuth(req, res, next) {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
      if (!token) throw erros.naoAutenticado();

      const sessao = await sessaoRepo.procurarAtiva(token);
      if (!sessao) throw erros.naoAutenticado();

      const utilizador = await utilizadorRepo.procurarPorId(sessao.utilizador_id);
      if (!utilizador || !utilizador.ativo) throw erros.naoAutenticado();

      req.utilizador = utilizador;
      next();
    } catch (err) {
      next(err);
    }
  };
}
// RBAC (Doc 04 §4.3): negação por omissão — só passa se o perfil estiver na lista.
export function createRequireRole(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.utilizador || !perfisPermitidos.includes(req.utilizador.perfil)) {
      return next(erros.naoAutorizado());
    }
    next();
  };
}