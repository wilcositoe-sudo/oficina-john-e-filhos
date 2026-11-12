import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createAdminRouter } from '../src/modules/admin/http/admin-routes.js';
import { criarApagarContaInterna } from '../src/modules/admin/use-cases/apagar-conta-interna.js';

const adminAtual = { id: 'admin-1', perfil: 'ADMINISTRADOR' };

test('admin can delete an unused internal account', async () => {
  let apagado;
  const apagar = criarApagarContaInterna({
    utilizadorRepo: {
      procurarPorId: async () => ({ id: 'staff-2', perfil: 'FUNCIONARIO' }),
      apagarContaInterna: async (id) => {
        apagado = id;
        return true;
      },
    },
  });

  await apagar({ id: 'staff-2', utilizador: adminAtual });
  assert.equal(apagado, 'staff-2');
});

test('admin cannot delete their own account or the last active admin', async () => {
  const apagar = criarApagarContaInterna({
    utilizadorRepo: {
      procurarPorId: async (id) => ({ id, perfil: 'ADMINISTRADOR' }),
      contarAdminsAtivos: async () => 0,
      apagarContaInterna: async () => assert.fail('não deve apagar administrador protegido'),
    },
  });

  await assert.rejects(
    apagar({ id: adminAtual.id, utilizador: adminAtual }),
    (error) => error.code === 'CONTA_PROPRIA' && error.status === 409,
  );
  await assert.rejects(
    apagar({ id: 'admin-2', utilizador: adminAtual }),
    (error) => error.code === 'ULTIMO_ADMIN_ATIVO' && error.status === 409,
  );
});

test('admin cannot delete an internal account referenced by operational history', async () => {
  const apagar = criarApagarContaInterna({
    utilizadorRepo: {
      procurarPorId: async () => ({ id: 'staff-2', perfil: 'MECANICO' }),
      apagarContaInterna: async () => {
        const error = new Error('foreign key constraint');
        error.code = '23503';
        throw error;
      },
    },
  });

  await assert.rejects(
    apagar({ id: 'staff-2', utilizador: adminAtual }),
    (error) => error.code === 'CONTA_COM_HISTORICO' && error.status === 409,
  );
});

test('non-admin cannot delete an internal account', async () => {
  const apagar = criarApagarContaInterna({
    utilizadorRepo: {
      procurarPorId: async () => assert.fail('não deve consultar conta'),
      apagarContaInterna: async () => assert.fail('não deve apagar conta'),
    },
  });

  await assert.rejects(
    apagar({ id: 'staff-2', utilizador: { id: 'staff-1', perfil: 'FUNCIONARIO' } }),
    (error) => error.code === 'NAO_AUTORIZADO' && error.status === 403,
  );
});

test('admin account delete endpoint uses the path id and returns 204', async () => {
  let apagada;
  const app = express();
  app.use(createAdminRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = adminAtual;
      next();
    },
    requireRole: (...roles) => (req, res, next) => {
      if (roles.includes(req.utilizador.perfil)) return next();
      res.sendStatus(403);
    },
    criarConta: async () => null,
    listarContas: async () => [],
    atualizarConta: async () => null,
    apagarConta: async ({ id, utilizador }) => {
      apagada = { id, utilizador };
    },
    definirPermissaoCatalogo: async () => null,
    dashboard: async () => ({}),
    moderarAvaliacoes: { listar: async () => [], atualizarPublicacao: async () => null },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/admin/utilizadores/staff-2`,
      { method: 'DELETE' },
    );
    assert.equal(response.status, 204);
    assert.deepEqual(apagada, { id: 'staff-2', utilizador: adminAtual });
  } finally {
    const fechado = once(server, 'close');
    server.close();
    await fechado;
  }
});
