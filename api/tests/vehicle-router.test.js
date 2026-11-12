import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createVehicleRouter } from '../src/modules/vehicles/http/vehicle-routes.js';

test('vehicle router delegates client-specific listing to injected use case', async () => {
  let emailConsultado;
  const app = express();
  app.use(createVehicleRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'staff1', perfil: 'FUNCIONARIO' };
      next();
    },
    requireRole: createRequireRole,
    registar: async () => null,
    listar: async () => [],
    detalhe: async () => null,
    listarPorCliente: async ({ email }) => {
      emailConsultado = email;
      return [{ id: 'v1' }];
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/clientes/cliente@example.test/veiculos`,
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [{ id: 'v1' }] });
    assert.equal(emailConsultado, 'cliente@example.test');
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('vehicle update binds both the path id and authenticated owner', async () => {
  let recebido;
  const app = express();
  app.use(express.json());
  app.use(createVehicleRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    requireRole: createRequireRole,
    registar: async () => null,
    listar: async () => [],
    detalhe: async () => null,
    listarPorCliente: async () => [],
    atualizar: async (dados) => {
      recebido = dados;
      return { id: dados.id, utilizadorId: dados.utilizador.id };
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/veiculos/v1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'v2',
        utilizador: { id: 'u2' },
        matricula: 'MTZ123AB',
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(recebido, {
      id: 'v1',
      utilizador: { id: 'u1', perfil: 'CLIENTE' },
      matricula: 'MTZ123AB',
    });
    assert.deepEqual(await response.json(), {
      data: { id: 'v1', utilizadorId: 'u1' },
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
