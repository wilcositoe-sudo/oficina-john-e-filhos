import assert from 'node:assert/strict';
import test from 'node:test';
import {
  criarEnviarMensagemCliente,
  criarIniciarConversa,
  criarListarConversasCliente,
  criarOcultarConversa,
  criarResponderStaff,
} from '../src/modules/chatbot/use-cases/chatbot-usecases.js';
import {
  criarListarConversasOs,
  criarOcultarConversaOs,
} from '../src/modules/messaging/use-cases/gerir-inbox.js';
import { criarListarMensagens } from '../src/modules/messaging/use-cases/listar-mensagens.js';

test('no-diagnosis client messages renew the 24-hour retention after the message', async () => {
  const calls = [];
  const chatRepo = {
    apagarExpiradas: async () => {},
    obterConversa: async () => ({
      id: 'c1',
      utilizadorId: 'u1',
      status: 'EM_ATENDIMENTO',
      querDiagnostico: false,
    }),
    criarMensagem: async () => calls.push('mensagem'),
    incrementarNaoLidasStaff: async () => {},
    atualizarConversa: async (dados) => calls.push(dados),
    listarMensagens: async () => [],
  };
  const enviar = criarEnviarMensagemCliente({ chatRepo });

  await enviar({
    utilizador: { id: 'u1', perfil: 'CLIENTE' },
    conversaId: 'c1',
    texto: 'Ainda preciso de ajuda',
  });

  assert.equal(calls[0], 'mensagem');
  assert.ok(Date.parse(calls[1].expiraEm) > Date.now());
});

test('staff replies renew no-diagnosis retention instead of making the conversation permanent', async () => {
  const updates = [];
  let mensagemCriada = false;
  const chatRepo = {
    obterConversa: async () => ({
      id: 'c1',
      querDiagnostico: false,
      atendidoPor: 's1',
    }),
    atualizarConversa: async (dados) => updates.push(dados),
    criarMensagem: async () => { mensagemCriada = true; },
    zerarNaoLidasStaff: async () => {},
    incrementarNaoLidasCliente: async () => {},
    listarMensagens: async () => [],
  };
  const responder = criarResponderStaff({ chatRepo });

  await responder({
    conversaId: 'c1',
    utilizador: { id: 's1', perfil: 'FUNCIONARIO' },
    conteudo: 'Entendido',
  });

  assert.equal(mensagemCriada, true);
  assert.ok(Date.parse(updates.at(-1).expiraEm) > Date.now());
});

test('client inbox lists all stored conversations after expiring due threads', async () => {
  const calls = [];
  const listar = criarListarConversasCliente({
    chatRepo: {
      apagarExpiradas: async () => calls.push('limpar'),
      listarConversasCliente: async (id) => {
        calls.push(id);
        return [{ id: 'c1', querDiagnostico: true }];
      },
    },
  });

  assert.deepEqual(await listar({ utilizador: { id: 'u1' } }), [
    { id: 'c1', querDiagnostico: true },
  ]);
  assert.deepEqual(calls, ['limpar', 'u1']);
});

test('starting a new chat creates a separate thread instead of reusing the active one', async () => {
  let novaRecebida;
  const conversa = { id: 'c2', utilizadorId: 'u1' };
  const chatRepo = {
    apagarExpiradas: async () => {},
    obterClientePorUtilizador: async () => ({ cliente_id: 'cl1', nome: 'Cliente' }),
    garantirConversa: async (dados) => {
      novaRecebida = dados.nova;
      return conversa;
    },
    listarMensagens: async () => [{ id: 'm1' }],
    obterConversa: async () => conversa,
  };
  const iniciar = criarIniciarConversa({ chatRepo });

  assert.deepEqual(
    await iniciar({ utilizador: { id: 'u1' }, nova: true }),
    { conversa, mensagens: [{ id: 'm1' }] },
  );
  assert.equal(novaRecebida, true);
});

test('chatbot conversation hiding is scoped to the participant', async () => {
  let ocultacao;
  const ocultar = criarOcultarConversa({
    chatRepo: {
      obterConversa: async () => ({ id: 'c1', utilizadorId: 'u1' }),
      ocultarConversa: async (dados) => { ocultacao = dados; },
    },
  });

  await ocultar({
    conversaId: 'c1',
    utilizador: { id: 'u1', perfil: 'CLIENTE' },
    isStaff: false,
  });
  assert.deepEqual(ocultacao, { conversaId: 'c1', utilizadorId: 'u1' });

  await assert.rejects(
    ocultar({
      conversaId: 'c1',
      utilizador: { id: 'u2', perfil: 'CLIENTE' },
      isStaff: false,
    }),
    (error) => error.code === 'NAO_AUTORIZADO' && error.status === 403,
  );
});

test('staff may hide a chatbot conversation from their own inbox', async () => {
  let ocultacao;
  const ocultar = criarOcultarConversa({
    chatRepo: {
      obterConversa: async () => ({ id: 'c1', utilizadorId: 'u1' }),
      ocultarConversa: async (dados) => { ocultacao = dados; },
    },
  });

  await ocultar({
    conversaId: 'c1',
    utilizador: { id: 's1', perfil: 'FUNCIONARIO' },
    isStaff: true,
  });
  assert.deepEqual(ocultacao, { conversaId: 'c1', utilizadorId: 's1' });
});

test('OS inbox delegates the authenticated user and hides only their own thread', async () => {
  const utilizador = { id: 'u1', perfil: 'CLIENTE' };
  let listingUser;
  let ocultacao;
  const osRepo = {
    procurarPorId: async () => ({ id: 'o1', utilizadorId: 'u1', mecanicoId: 'm1' }),
  };
  const mensagemRepo = {
    listarConversas: async ({ utilizador: atual }) => {
      listingUser = atual;
      return [{ id: 'o1', tipo: 'OS', naoLidas: 2 }];
    },
    ocultarConversa: async (dados) => { ocultacao = dados; },
  };
  const listar = criarListarConversasOs({ mensagemRepo });
  const ocultar = criarOcultarConversaOs({ mensagemRepo, osRepo });

  assert.deepEqual(await listar({ utilizador }), [{ id: 'o1', tipo: 'OS', naoLidas: 2 }]);
  assert.equal(listingUser, utilizador);
  await ocultar({ ordemId: 'o1', utilizador });
  assert.deepEqual(ocultacao, { ordemId: 'o1', utilizadorId: 'u1' });
});

test('OS inbox rejects hiding a conversation belonging to another client', async () => {
  const ocultar = criarOcultarConversaOs({
    osRepo: {
      procurarPorId: async () => ({ id: 'o1', utilizadorId: 'u2', mecanicoId: 'm1' }),
    },
    mensagemRepo: {
      ocultarConversa: async () => assert.fail('não deve ocultar'),
    },
  });

  await assert.rejects(
    ocultar({ ordemId: 'o1', utilizador: { id: 'u1', perfil: 'CLIENTE' } }),
    (error) => error.code === 'NAO_AUTORIZADO' && error.status === 403,
  );
});

test('reading an OS chat advances only the authenticated participant read cursor', async () => {
  const calls = [];
  const listar = criarListarMensagens({
    osRepo: {
      procurarPorId: async () => ({
        id: 'o1',
        utilizadorId: 'u1',
        mecanicoId: 'm1',
      }),
    },
    mensagemRepo: {
      marcarLidas: async (dados) => calls.push(['lidas', dados]),
      listarPorOrdem: async () => [{ id: 'm1', tipo: 'SISTEMA' }],
    },
  });

  assert.deepEqual(
    await listar({ ordemId: 'o1', utilizador: { id: 'u1', perfil: 'CLIENTE' } }),
    [{ id: 'm1', tipo: 'SISTEMA' }],
  );
  assert.deepEqual(calls, [['lidas', { ordemId: 'o1', utilizadorId: 'u1' }]]);
});
