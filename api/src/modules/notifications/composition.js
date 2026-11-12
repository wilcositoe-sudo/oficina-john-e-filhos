import { criarPgNotificacaoRepository } from './adapters/pg-notificacao-repository.js';
import { criarGerirNotificacoes } from './use-cases/gerir-notificacoes.js';

export function createNotificationsDependencies({ requireAuth }) {
  const notificacaoRepo = criarPgNotificacaoRepository();
  return {
    requireAuth,
    notificacoes: criarGerirNotificacoes({ notificacaoRepo }),
  };
}
