import { criarPgChatbotRepository } from './adapters/pg-chatbot-repository.js';
import {
  criarIniciarConversa,
  criarEnviarMensagemCliente,
  criarObterConversa,
  criarAgendarDiagnostico,
  criarDefinirChegadaOficina,
  criarListarConversasStaff,
  criarAtenderConversaStaff,
  criarResponderStaff,
  criarDefinirDecisaoDiagnosticoStaff,
  criarFecharConversaStaff,
  criarConverterLeadEmOs,
  criarListarConversasCliente,
  criarOcultarConversa,
} from './use-cases/chatbot-usecases.js';

export function createChatbotDependencies({
  requireAuth,
  requireRole,
  utilizadorRepo,
  clienteRepo,
  veiculoRepo,
  osRepo,
  criarOS,
}) {
  const chatRepo = criarPgChatbotRepository();

  return {
    requireAuth,
    requireRole,
    iniciarConversa: criarIniciarConversa({ chatRepo }),
    enviarMensagemCliente: criarEnviarMensagemCliente({ chatRepo }),
    obterConversa: criarObterConversa({ chatRepo }),
    agendarDiagnostico: criarAgendarDiagnostico({ chatRepo }),
    definirChegadaOficina: criarDefinirChegadaOficina({ chatRepo }),
    listarConversasStaff: criarListarConversasStaff({ chatRepo }),
    atenderConversaStaff: criarAtenderConversaStaff({ chatRepo }),
    responderStaff: criarResponderStaff({ chatRepo }),
    definirDecisaoDiagnosticoStaff: criarDefinirDecisaoDiagnosticoStaff({ chatRepo }),
    fecharConversaStaff: criarFecharConversaStaff({ chatRepo }),
    converterLeadEmOs: criarConverterLeadEmOs({ chatRepo, criarOS, osRepo }),
    listarConversasCliente: criarListarConversasCliente({ chatRepo }),
    ocultarConversa: criarOcultarConversa({ chatRepo }),
  };
}
