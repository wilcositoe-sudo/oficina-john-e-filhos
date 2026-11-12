import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { createAuthRouter } from '../src/modules/auth/http/auth-routes.js';
import { criarAtualizarPerfil } from '../src/modules/auth/use-cases/atualizar-perfil.js';
import { criarAlterarSenha } from '../src/modules/auth/use-cases/alterar-senha.js';

test('profile update normalizes contact data and preserves profile role', async () => {
  let received;
  const atualizarPerfil = criarAtualizarPerfil({
    utilizadorRepo: {
      procurarPorEmail: async () => null,
      procurarPorTelefone: async () => null,
      atualizarPerfil: async (dados) => {
        received = dados;
        return { ...dados, perfil: 'CLIENTE' };
      },
    },
  });

  const result = await atualizarPerfil({
    utilizador: { id: 'u1', nome: 'Cliente', email: 'old@example.test', telefone: null },
    nome: '  Cliente Atualizado ',
    email: ' Novo@Example.Test ',
  });

  assert.deepEqual(result, {
    id: 'u1',
    nome: 'Cliente Atualizado',
    email: 'novo@example.test',
    telefone: null,
    perfil: 'CLIENTE',
  });
  assert.equal(received.id, 'u1');
});

test('profile update rejects removal of the final contact method', async () => {
  const atualizarPerfil = criarAtualizarPerfil({
    utilizadorRepo: {
      procurarPorEmail: async () => null,
      procurarPorTelefone: async () => null,
      atualizarPerfil: async () => assert.fail('não deve atualizar'),
    },
  });

  await assert.rejects(
    atualizarPerfil({
      utilizador: { id: 'u1', nome: 'Cliente', email: 'c@example.test', telefone: null },
      email: '',
    }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});

test('password change revokes sessions after checking the current password', async () => {
  const calls = [];
  const alterarSenha = criarAlterarSenha({
    utilizadorRepo: {
      procurarCredenciaisPorId: async () => ({ password_hash: 'senha-atual' }),
      atualizarSenha: async (id, hash) => calls.push(['senha', id, hash]),
    },
    sessaoRepo: {
      revogarTodas: async (id) => calls.push(['sessoes', id]),
    },
    passwordHasher: {
      comparar: async (senha, hash) => senha === hash,
      hash: async (senha) => `hash:${senha}`,
    },
  });

  await alterarSenha({
    utilizador: { id: 'u1' },
    senhaAtual: 'senha-atual',
    novaSenha: 'senha-nova-123',
  });

  assert.deepEqual(calls, [
    ['sessoes', 'u1'],
    ['senha', 'u1', 'hash:senha-nova-123'],
  ]);
});

test('password change rejects an incorrect current password without revoking sessions', async () => {
  let revogou = false;
  const alterarSenha = criarAlterarSenha({
    utilizadorRepo: {
      procurarCredenciaisPorId: async () => ({ password_hash: 'senha-atual' }),
      atualizarSenha: async () => assert.fail('não deve atualizar'),
    },
    sessaoRepo: {
      revogarTodas: async () => { revogou = true; },
    },
    passwordHasher: {
      comparar: async (senha, hash) => senha === hash,
      hash: async (senha) => senha,
    },
  });

  await assert.rejects(
    alterarSenha({
      utilizador: { id: 'u1' },
      senhaAtual: 'errada',
      novaSenha: 'senha-nova-123',
    }),
    (error) => error.code === 'CREDENCIAIS_INVALIDAS' && error.status === 401,
  );
  assert.equal(revogou, false);
});

test('profile route always uses the authenticated account, not request-supplied identity', async () => {
  let received;
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter({
    requireAuth: (req, res, next) => {
      req.utilizador = { id: 'u1', nome: 'Cliente', perfil: 'CLIENTE' };
      next();
    },
    atualizarPerfil: async (dados) => {
      received = dados;
      return { id: dados.utilizador.id, nome: dados.nome };
    },
  }));
  const server = app.listen(0);
  await once(server, 'listening');

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'u2',
        utilizador: { id: 'u2' },
        nome: 'Nome Atualizado',
      }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { id: 'u1', nome: 'Nome Atualizado' },
    });
    assert.equal(received.utilizador.id, 'u1');
    assert.deepEqual(Object.keys(received).sort(), ['nome', 'utilizador']);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
