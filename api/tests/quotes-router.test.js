import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createQuotesRouter } from '../src/modules/quotes/http/quotes-routes.js';
import { criarSolicitarOrcamento } from '../src/modules/quotes/use-cases/solicitar-orcamento.js';

test('quotes router delegates request to injected use case', async () => {
  let input;
  const casosDeUso = {
    solicitar: async (dados) => {
      input = dados;
      return { id: 'q1', estado: 'SOLICITADO' };
    },
    listarCliente: async () => [],
    listarStaff: async () => [],
    responder: async () => null,
    decidir: async () => null,
  };
  const app = express();
  app.use(express.json());
  app.use(createQuotesRouter({
    casosDeUso,
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil: 'CLIENTE' };
      next();
    },
    requireRole: createRequireRole,
  }));
  app.use((err, req, res, next) => {
    res.status(err.status ?? 500).json({ error: { code: err.code } });
  });

  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/orcamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        veiculoId: 'v1',
        descricaoProblema: 'Ruído no motor ao acelerar',
      }),
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      data: { id: 'q1', estado: 'SOLICITADO' },
    });
    assert.deepEqual(input, {
      utilizadorId: 'u1',
      veiculoId: 'v1',
      descricaoProblema: 'Ruído no motor ao acelerar',
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('quote request rejects a vehicle belonging to another user', async () => {
  const solicitarOrcamento = criarSolicitarOrcamento({
    orcamentoRepo: {
      criar: async () => {
        throw new Error('Should not create a quote for a foreign vehicle');
      },
    },
    veiculoRepo: {
      procurarPorId: async () => ({ id: 'v1', utilizadorId: 20 }),
    },
  });

  await assert.rejects(
    solicitarOrcamento({
      utilizadorId: '10',
      veiculoId: 'v1',
      descricaoProblema: 'Ruído no motor ao acelerar',
    }),
    { code: 'VEICULO_INVALIDO', status: 422 },
  );
});
