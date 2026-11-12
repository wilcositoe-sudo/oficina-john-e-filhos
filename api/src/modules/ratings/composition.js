import { criarPgAvaliacaoRepository } from './adapters/pg-avaliacao-repository.js';
import { criarAvaliarOs } from './use-cases/avaliar-os.js';
import { criarListarAvaliacoesPublicas } from './use-cases/listar-avaliacoes-publicas.js';
import { criarModerarAvaliacoes } from './use-cases/moderar-avaliacoes.js';

export function createRatingsDependencies({ requireAuth, requireRole, osRepo, clienteRepo }) {
  const avaliacaoRepo = criarPgAvaliacaoRepository();
  return {
    requireAuth,
    requireRole,
    avaliar: criarAvaliarOs({ avaliacaoRepo, osRepo, clienteRepo }),
    listarPublicas: criarListarAvaliacoesPublicas({ avaliacaoRepo }),
    moderar: criarModerarAvaliacoes({ avaliacaoRepo }),
  };
}
