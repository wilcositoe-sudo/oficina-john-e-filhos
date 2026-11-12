import assert from 'node:assert/strict';
import test from 'node:test';
import { processarMensagem } from '../src/modules/chatbot/domain/chatbot-engine.js';
import { criarConverterLeadEmOs } from '../src/modules/chatbot/use-cases/chatbot-usecases.js';

function criarConversa(overrides = {}) {
  return {
    id: 'conversa1',
    status: 'AGUARDANDO_FUNCIONARIO',
    veiculoId: 7,
    problema: 'motor falha',
    email: 'cliente@example.test',
    querDiagnostico: true,
    chegadaModalidade: 'RECOLHA_DOMICILIO',
    modalidadeEntrega: null,
    ...overrides,
  };
}

function criarConversor(conversa, guardarOS) {
  const chatRepo = {
    obterConversa: async () => conversa,
    listarMensagens: async () => [],
    atualizarConversa: async () => {},
    criarMensagem: async () => {},
    incrementarNaoLidasCliente: async () => {},
  };

  return criarConverterLeadEmOs({
    chatRepo,
    criarOS: async (dados) => {
      guardarOS(dados);
      return { id: 'os1', numeroOS: 'OS-001', estado: 'PENDENTE' };
    },
    osRepo: {},
  });
}

test('chatbot asks for a full problem description before saving it', () => {
  const resultado = processarMensagem({
    texto: 'motor',
    conversa: { etapa: 'DESCRIVER_PROBLEMA', veiculoId: 7 },
    cliente: {},
    veiculos: [],
    servicos: [],
    pecas: [],
  });

  assert.equal(resultado.atualizar.problema, undefined);
  assert.match(resultado.resposta, /10 caracteres/);
});

test('lead conversion rejects short problem descriptions before creating an OS', async () => {
  let criarOSChamado = false;
  const converter = criarConversor(
    criarConversa({ problema: 'motor' }),
    () => {
      criarOSChamado = true;
    },
  );

  await assert.rejects(
    converter({
      conversaId: 'conversa1',
      utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
    }),
    {
      status: 422,
      message: 'A descrição do problema deve ter pelo menos 10 caracteres.',
    },
  );
  assert.equal(criarOSChamado, false);
});

test('staff can complete a short problem description when converting a lead', async () => {
  let dadosOS;
  const converter = criarConversor(
    criarConversa({ problema: 'motor' }),
    (dados) => {
      dadosOS = dados;
    },
  );

  await converter({
    conversaId: 'conversa1',
    utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
    descricaoProblema: 'Motor falha ao acelerar',
  });

  assert.equal(dadosOS.descricaoProblema, 'Motor falha ao acelerar');
});
