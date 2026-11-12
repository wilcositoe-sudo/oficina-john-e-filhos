import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createAppointmentsRouter } from '../src/modules/appointments/http/appointments-routes.js';
import { createMessagingRouter } from '../src/modules/messaging/http/messaging-routes.js';

test('appointments router delegates availability to its injected use case', async () => {
  let dataConsultada;
  const app = express();
  app.use(createAppointmentsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    requireRole: createRequireRole,
    disponibilidade: async ({ data }) => {
      dataConsultada = data;
      return [{ inicioAt: '2026-11-12T08:00:00.000Z' }];
    },
    agendar: async () => null,
    cancelar: async () => null,
    listarMeus: async () => [],
    listarStaff: async () => [],
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/agendamentos/disponibilidade?data=2026-11-12`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{ inicioAt: '2026-11-12T08:00:00.000Z' }],
    });
    assert.equal(dataConsultada, '2026-11-12');
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('messaging router delegates message creation to its injected use case', async () => {
  let mensagem;
  const app = express();
  app.use(express.json());
  app.use(createMessagingRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    enviar: async (dados) => {
      mensagem = dados;
      return { id: 'm1', conteudo: dados.conteudo };
    },
    listar: async () => [],
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/ordens/10/mensagens`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: 'Como está a reparação?' }),
      },
    );
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      data: { id: 'm1', conteudo: 'Como está a reparação?' },
    });
    assert.deepEqual(mensagem, {
      ordemId: '10',
      remetente: { id: 'u1', perfil: 'CLIENTE' },
      conteudo: 'Como está a reparação?',
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('messaging inbox lists OS conversations for the authenticated participant', async () => {
  let utilizadorRecebido;
  const app = express();
  app.use(createMessagingRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u2', perfil: 'CLIENTE' };
      next();
    },
    listarConversasOs: async ({ utilizador }) => {
      utilizadorRecebido = utilizador;
      return [{ id: 'os1', tipo: 'OS', naoLidas: 1 }];
    },
    ocultarConversaOs: async () => {},
    enviar: async () => null,
    listar: async () => [],
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/mensagens/conversas`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{ id: 'os1', tipo: 'OS', naoLidas: 1 }],
    });
    assert.deepEqual(utilizadorRecebido, { id: 'u2', perfil: 'CLIENTE' });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('messaging inbox hides a conversation only for the authenticated participant', async () => {
  let dados;
  const app = express();
  app.use(createMessagingRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'staff1', perfil: 'FUNCIONARIO' };
      next();
    },
    listarConversasOs: async () => [],
    ocultarConversaOs: async (recebidos) => { dados = recebidos; },
    enviar: async () => null,
    listar: async () => [],
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/mensagens/conversas/os7`,
      { method: 'DELETE' },
    );
    assert.equal(response.status, 204);
    assert.deepEqual(dados, {
      ordemId: 'os7',
      utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
