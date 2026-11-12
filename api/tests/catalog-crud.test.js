import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { createCatalogRouter } from '../src/modules/catalog/http/catalog-routes.js';
import { criarAtualizarServico } from '../src/modules/catalog/use-cases/atualizar-servico.js';
import { criarAtualizarPeca } from '../src/modules/parts/use-cases/atualizar-peca.js';
import { criarAtualizarVeiculo } from '../src/modules/vehicles/use-cases/atualizar-veiculo.js';

test('service update normalizes fields and supports deactivation', async () => {
  let received;
  const atualizarServico = criarAtualizarServico({
    servicoRepo: {
      procurarPorId: async () => ({ id: 's1' }),
      atualizar: async (dados) => {
        received = dados;
        return dados;
      },
    },
  });

  const result = await atualizarServico({
    id: 's1',
    nome: '  Diagnóstico  ',
    descricao: '  Motor  ',
    precoBase: '12.3',
    ativo: false,
  });

  assert.deepEqual(result, {
    id: 's1',
    nome: 'Diagnóstico',
    descricao: 'Motor',
    precoBase: '12.30',
    ativo: false,
  });
  assert.deepEqual(received, result);
});

test('service update rejects null prices instead of treating them as zero', async () => {
  const atualizarServico = criarAtualizarServico({
    servicoRepo: {
      procurarPorId: async () => ({ id: 's1' }),
      atualizar: async () => assert.fail('não deve atualizar'),
    },
  });

  await assert.rejects(
    atualizarServico({ id: 's1', precoBase: null }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});

test('part update validates stock and normalizes price in cents', async () => {
  let received;
  const atualizarPeca = criarAtualizarPeca({
    pecaRepo: {
      procurarPorId: async () => ({ id: 'p1' }),
      atualizar: async (dados) => {
        received = dados;
        return dados;
      },
    },
  });

  await atualizarPeca({ id: 'p1', precoUnitario: '19.9', quantidadeStock: '4', ativo: false });
  assert.deepEqual(received, {
    id: 'p1',
    precoUnitario: '19.90',
    quantidadeStock: 4,
    ativo: false,
  });

  await assert.rejects(
    atualizarPeca({ id: 'p1', quantidadeStock: -1 }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});

test('vehicle update normalizes registration and rejects another owner', async () => {
  let received;
  const atualizarVeiculo = criarAtualizarVeiculo({
    veiculoRepo: {
      procurarPorId: async () => ({
        id: 'v1',
        utilizadorId: 'u1',
        matricula: 'MTZ123AB',
      }),
      procurarPorMatricula: async () => null,
      atualizar: async (dados) => {
        received = dados;
        return dados;
      },
    },
  });

  await atualizarVeiculo({
    id: 'v1',
    utilizador: { id: 'u1', perfil: 'CLIENTE' },
    matricula: 'mtz 123 ab',
    ano: null,
  });
  assert.deepEqual(received, {
    id: 'v1',
    utilizadorId: 'u1',
    matricula: 'MTZ123AB',
    ano: null,
  });

  await assert.rejects(
    atualizarVeiculo({ id: 'v1', utilizador: { id: 'u2' }, marca: 'Toyota' }),
    (error) => error.code === 'NAO_AUTORIZADO' && error.status === 403,
  );
});

test('catalog updates use the path id and still enforce catalog permissions', async () => {
  let received;
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
    atualizar: async (dados) => {
      received = dados;
      return dados;
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/servicos/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 's2', nome: 'Revisão' }),
    });
    assert.equal(response.status, 200);
    assert.equal(received.id, 's1');
    assert.equal(received.nome, 'Revisão');
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }

  const deniedApp = express();
  deniedApp.use(express.json());
  deniedApp.use(createCatalogRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'f1', perfil: 'FUNCIONARIO', podeGerirCatalogo: false };
      next();
    },
    requireRole: createRequireRole,
    criar: async () => null,
    listarPublico: async () => [],
    listarTodos: async () => [],
    desativar: async () => null,
    atualizar: async () => assert.fail('não deve atualizar sem permissão'),
  }));
  const deniedServer = deniedApp.listen(0);
  await once(deniedServer, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${deniedServer.address().port}/servicos/s1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Revisão' }),
    });
    assert.equal(response.status, 403);
  } finally {
    const closed = once(deniedServer, 'close');
    deniedServer.close();
    await closed;
  }
});
