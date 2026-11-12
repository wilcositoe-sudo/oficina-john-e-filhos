import { criarPgEvidenciaRepository } from './adapters/pg-evidencia-repository.js';
import { criarGerirEvidencias } from './use-cases/gerir-evidencias.js';

export function createEvidenciasDependencies({ requireAuth, requireRole }) {
  return {
    requireAuth,
    requireRole,
    evidencias: criarGerirEvidencias({
      evidenciaRepo: criarPgEvidenciaRepository(),
    }),
  };
}
