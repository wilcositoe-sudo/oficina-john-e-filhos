import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createRequireRole } from '../src/modules/auth/http/session-middleware.js';
import { DomainError } from '../src/shared/errors/domain-error.js';
import { createWorkOrdersRouter } from '../src/modules/work-orders/http/work-orders-routes.js';

function criarDependencias(perfil) {
  const nomesCasosDeUso = [
    'criarOS',
    'listarOsStaff',
    'detalheOs',
    'transitarOs',
    'adicionarServico',
    'adicionarPeca',
    'listarHistoricoOs',
    'listarMinhasOs',
    'escolherEntrega',
    'atribuirMecanico',
    'submeterDiagnostico',
    'precificarOS',
    'decisaoCliente',
    'validarRevisao',
    'iniciarDiagnostico',
    'concluirReparacao',
    'iniciarReparacao',
    'registarNovaNecessidade',
    'transitarOsStaff',
    'listarOsMecanico',
    'listarLinhasOs',
    'listarChecklistOs',
    'listarMecanicos',
  ];

  return {
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', perfil };
      next();
    },
    requireRole: createRequireRole,
    ...Object.fromEntries(nomesCasosDeUso.map((nome) => [nome, async () => []])),
    listarOsMecanico: async ({ utilizadorId }) => [{ mecanicoId: utilizadorId }],
  };
}

test('work-orders router uses injected dependencies for mechanic list', async () => {
  const app = express();
  app.use(createWorkOrdersRouter(criarDependencias('MECANICO')));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ordens/minhas`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { data: [{ mecanicoId: 'u1' }] });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('work-orders router protects staff-only mechanic directory', async () => {
  const app = express();
  const dependencies = criarDependencias('CLIENTE');
  dependencies.listarMecanicos = async () => [{ id: 'm1', perfil: 'MECANICO' }];
  app.use(createWorkOrdersRouter(dependencies));
  app.use((err, req, res, next) => {
    res.status(err.status ?? 500).json({ error: { code: err.code } });
  });
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ordens/mecanicos`);
    assert.equal(response.status, 403);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('work-orders router delegates mechanic directory to injected use case', async () => {
  const app = express();
  const dependencies = criarDependencias('ADMINISTRADOR');
  dependencies.listarMecanicos = async () => [{ id: 'm1', perfil: 'MECANICO' }];
  app.use(createWorkOrdersRouter(dependencies));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ordens/mecanicos`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: [{ id: 'm1', perfil: 'MECANICO' }],
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('work-orders router forwards delivery address and optional live coordinates', async () => {
  const app = express();
  app.use(express.json());
  const dependencies = criarDependencias('CLIENTE');
  let entregaRecebida;
  dependencies.escolherEntrega = async (dados) => {
    entregaRecebida = dados;
    return { id: '10', enderecoEntrega: dados.enderecoEntrega };
  };
  app.use(createWorkOrdersRouter(dependencies));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ordens/10/entrega`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modalidade: 'DOMICILIO',
        enderecoEntrega: 'Bairro Central, casa 12',
        lat: -16.1,
        lng: 33.6,
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(entregaRecebida, {
      ordemId: '10',
      utilizador: { id: 'u1', perfil: 'CLIENTE' },
      modalidade: 'DOMICILIO',
      enderecoEntrega: 'Bairro Central, casa 12',
      lat: -16.1,
      lng: 33.6,
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});

test('work-orders router preserves legacy response for mechanic-reserved transition', async () => {
  const app = express();
  app.use(express.json());
  const dependencies = criarDependencias('FUNCIONARIO');
  dependencies.transitarOsStaff = async () => {
    throw new DomainError(
      'ACAO_RESERVADA_MECANICO',
      'Esta OS já está atribuída a um mecânico. Esta ação pertence ao mecânico responsável.',
      403,
    );
  };
  app.use(createWorkOrdersRouter(dependencies));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ordens/1/transicoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'concluir' }),
    });
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), {
      erro: {
        codigo: 'ACAO_RESERVADA_MECANICO',
        mensagem: 'Esta OS já está atribuída a um mecânico. Esta ação pertence ao mecânico responsável.',
      },
    });
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
