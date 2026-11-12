import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createAuthRouter } from '../src/modules/auth/http/auth-routes.js';

test('auth router delegates registration to the injected use case', async () => {
  let input;
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({
    utilizadorRepo: { procurarPorId: async () => null },
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    registarCliente: async (dados) => {
      input = dados;
      return { id: 'u2', perfil: 'CLIENTE' };
    },
    login: async () => null,
    solicitarRecuperacao: async () => null,
    confirmarRecuperacao: async () => null,
    logout: async () => undefined,
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Cliente', email: 'cliente@example.test' }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      data: { id: 'u2', perfil: 'CLIENTE' },
    });
    assert.deepEqual(input, { nome: 'Cliente', email: 'cliente@example.test' });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
