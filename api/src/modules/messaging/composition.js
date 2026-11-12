import { criarPgMensagemRepository } from './adapters/pg-mensagem-repository.js';
import { criarEnviarMensagem } from './use-cases/enviar-mensagem.js';
import { criarListarMensagens } from './use-cases/listar-mensagens.js';
import { criarListarConversasOs, criarOcultarConversaOs } from './use-cases/gerir-inbox.js';

export function createMessagingDependencies({ requireAuth, osRepo }) {
  const mensagemRepo = criarPgMensagemRepository();
  return {
    requireAuth,
    enviar: criarEnviarMensagem({ mensagemRepo, osRepo }),
    listar: criarListarMensagens({ mensagemRepo, osRepo }),
    listarConversasOs: criarListarConversasOs({ mensagemRepo }),
    ocultarConversaOs: criarOcultarConversaOs({ mensagemRepo, osRepo }),
  };
}
