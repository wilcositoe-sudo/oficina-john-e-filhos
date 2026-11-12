import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createRatingsRouter } from '../src/modules/ratings/http/ratings-routes.js';

test('ratings router delegates moderation to injected use cases', async () => {
  const chamadas = [];
  const app = express();
  app.use(express.json());
  app.use(createRatingsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'admin1', perfil: 'ADMINISTRADOR' };
      next();
    },
    requireRole: createRequireRole,
    avaliar: async () => null,
    listarPublicas: async () => [],
    moderar: {
      listar: async () => [{ id: 'r1', publicada: true }],
      atualizarPublicacao: async (dados) => {
        chamadas.push(dados);
        return { id: dados.id, publicada: dados.publicada };
      },
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const listResponse = await fetch(`${base}/admin/avaliacoes`);
    assert.equal(listResponse.status, 200);
    assert.deepEqual(await listResponse.json(), {
      data: [{ id: 'r1', publicada: true }],
    });

    const updateResponse = await fetch(`${base}/admin/avaliacoes/r1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicada: false }),
    });
    assert.equal(updateResponse.status, 200);
    assert.deepEqual(await updateResponse.json(), {
      data: { id: 'r1', publicada: false },
    });
    assert.deepEqual(chamadas, [{ id: 'r1', publicada: false }]);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
