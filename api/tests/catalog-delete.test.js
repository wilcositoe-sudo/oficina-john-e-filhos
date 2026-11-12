import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createCatalogRouter } from '../src/modules/catalog/http/catalog-routes.js';
import { criarApagarServico } from '../src/modules/catalog/use-cases/apagar-servico.js';
import { createPartsRouter } from '../src/modules/parts/http/parts-routes.js';
import { criarApagarPeca } from '../src/modules/parts/use-cases/apagar-peca.js';

async function comServidor(app, executar) {
  const server = app.listen(0);
  await once(server, 'listening');
  try {
    await executar(`http://127.0.0.1:${server.address().port}`);
  } finally {
    const fechado = once(server, 'close');
    server.close();
    await fechado;
  }
}

test('service delete route uses the URL id, returns 204, and preserves catalog permissions', async () => {
  let apagado;
  const app = express();
  app.use(express.json());
  app.use(createCatalogRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'admin1', perfil: 'ADMINISTRADOR' };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listarPublico: async () => [],
    listarTodos: async () => [],
    desativar: async () => null,
    atualizar: async () => null,
    apagar: async (id) => { apagado = id; },
  }));

  await comServidor(app, async (base) => {
    const response = await fetch(`${base}/servicos/s1`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    assert.equal(apagado, 's1');
  });

  const deniedApp = express();
  deniedApp.use(createCatalogRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'staff1', perfil: 'FUNCIONARIO', podeGerirCatalogo: false };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listarPublico: async () => [],
    listarTodos: async () => [],
    desativar: async () => null,
    atualizar: async () => null,
    apagar: async () => assert.fail('não deve apagar sem permissão'),
  }));
  await comServidor(deniedApp, async (base) => {
    const response = await fetch(`${base}/servicos/s1`, { method: 'DELETE' });
    assert.equal(response.status, 403);
  });
});

test('part delete route uses the URL id and returns 204', async () => {
  let apagado;
  const app = express();
  app.use(createPartsRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'admin1', perfil: 'ADMINISTRADOR' };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listar: async () => [],
    atualizar: async () => null,
    apagar: async (id) => { apagado = id; },
  }));

  await comServidor(app, async (base) => {
    const response = await fetch(`${base}/pecas/p1`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    assert.equal(apagado, 'p1');
  });
});

test('catalog delete use cases report missing records', async () => {
  const apagarServico = criarApagarServico({
    servicoRepo: { apagar: async () => false },
  });
  const apagarPeca = criarApagarPeca({
    pecaRepo: { apagar: async () => false },
  });

  await assert.rejects(
    apagarServico('s-missing'),
    (error) => error.code === 'SERVICO_NAO_ENCONTRADO' && error.status === 404,
  );
  await assert.rejects(
    apagarPeca('p-missing'),
    (error) => error.code === 'PECA_NAO_ENCONTRADA' && error.status === 404,
  );
});
