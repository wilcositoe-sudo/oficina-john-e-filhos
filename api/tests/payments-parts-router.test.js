import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createPartsRouter } from '../src/modules/parts/http/parts-routes.js';
import { createPaymentsRouter } from '../src/modules/payments/http/payments-routes.js';

test('payments router delegates payment creation to the injected use case', async () => {
  let input;
  const app = express();
  app.use(express.json());
  app.use(createPaymentsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    registar: async (dados) => {
      input = dados;
      return { id: 'p1', estado: 'PENDENTE' };
    },
    webhook: async () => null,
    listar: async () => [],
    recibo: async () => null,
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/ordens/10/pagamentos`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodo: 'MOBILE_MONEY' }),
      },
    );
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      data: { id: 'p1', estado: 'PENDENTE' },
    });
    assert.deepEqual(input, {
      ordemId: '10',
      utilizador: { id: 'u1', perfil: 'CLIENTE' },
      metodo: 'MOBILE_MONEY',
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('parts router removes prices from mechanic catalog responses', async () => {
  const app = express();
  app.use(createPartsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'm1', perfil: 'MECANICO' };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listar: async () => [{
      id: 'part1',
      nome: 'Filtro',
      precoUnitario: '250.00',
      ativo: true,
    }],
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/pecas`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{ id: 'part1', nome: 'Filtro', ativo: true }],
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
