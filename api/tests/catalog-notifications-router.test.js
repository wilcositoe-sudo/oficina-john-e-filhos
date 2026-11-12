import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createCatalogRouter } from '../src/modules/catalog/http/catalog-routes.js';
import { createNotificationsRouter } from '../src/modules/notifications/http/notifications-routes.js';

test('catalog router filters inactive services and strips prices for mechanics', async () => {
  const app = express();
  app.use(createCatalogRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'm1', perfil: 'MECANICO' };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listarPublico: async () => [],
    listarTodos: async () => [
      { id: 's1', nome: 'Ativo', precoBase: '100.00', ativo: true },
      { id: 's2', nome: 'Inativo', precoBase: '200.00', ativo: false },
    ],
    desativar: async () => null,
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/servicos/todos`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{ id: 's1', nome: 'Ativo', ativo: true }],
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('notifications router delegates reads to injected notification operations', async () => {
  let utilizadorRecebido;
  const app = express();
  app.use(createNotificationsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    notificacoes: {
      listar: async (dados) => {
        utilizadorRecebido = dados;
        return [{ id: 'n1', lida: false }];
      },
      marcarTodasLidas: async () => 1,
      marcarLida: async () => true,
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/notificacoes`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [{ id: 'n1', lida: false }] });
    assert.deepEqual(utilizadorRecebido, { utilizadorId: 'u1', perfil: 'CLIENTE' });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
