import assert from 'node:assert/strict';
import test from 'node:test';
import { criarConfirmarRecuperacao } from '../src/modules/auth/use-cases/confirmar-recuperacao.js';
import { criarSolicitarRecuperacao } from '../src/modules/auth/use-cases/solicitar-recuperacao.js';

test('password recovery only returns the test token outside production and never logs it', async () => {
  let tokenGuardado;
  const utilizadorRepo = {
    procurarPorEmail: async () => ({ id: 'u1', ativo: true }),
    guardarTokenRecuperacao: async (_id, token) => { tokenGuardado = token; },
  };
  const originalLog = console.log;
  console.log = () => assert.fail('não deve registar tokens no log');

  try {
    const solicitarEmDesenvolvimento = criarSolicitarRecuperacao({
      utilizadorRepo,
      ambiente: 'development',
    });
    const resultadoDev = await solicitarEmDesenvolvimento({ email: '  U@EXAMPLE.TEST ' });
    assert.match(resultadoDev.tokenDeTeste, /^[a-f0-9]{64}$/);
    assert.match(tokenGuardado, /^[a-f0-9]{64}$/);
    assert.notEqual(resultadoDev.tokenDeTeste, tokenGuardado);

    const solicitarEmProducao = criarSolicitarRecuperacao({
      utilizadorRepo,
      ambiente: 'production',
    });
    const resultadoProd = await solicitarEmProducao({ email: 'u@example.test' });
    assert.deepEqual(resultadoProd, {
      mensagem: 'Se este e-mail estiver registado, receberá as instruções.',
    });
  } finally {
    console.log = originalLog;
  }
});

test('password reset reports invalid password using the domain error contract', async () => {
  const confirmar = criarConfirmarRecuperacao({
    utilizadorRepo: {
      procurarPorTokenRecuperacao: async () => assert.fail('token não deve ser consultado'),
    },
    passwordHasher: {},
  });

  await assert.rejects(
    confirmar({ token: 'token', novaSenha: 'curta' }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});

test('password reset rejects expired or malformed expiration timestamps', async () => {
  for (const resetTokenExpiresAt of ['2020-01-01T00:00:00.000Z', 'data-inválida']) {
    const confirmar = criarConfirmarRecuperacao({
      utilizadorRepo: {
        procurarPorTokenRecuperacao: async () => ({ id: 'u1', resetTokenExpiresAt }),
      },
      passwordHasher: {
        hash: async () => assert.fail('não deve alterar senha'),
      },
    });

    await assert.rejects(
      confirmar({ token: 'token', novaSenha: 'senha-segura-123' }),
      (error) => error.code === 'TOKEN_EXPIRADO' && error.status === 400,
    );
  }
});

test('password reset hashes the new password and invalidates the recovery token', async () => {
  const calls = [];
  let tokenConsultado;
  const confirmar = criarConfirmarRecuperacao({
    utilizadorRepo: {
      procurarPorTokenRecuperacao: async (hash) => {
        tokenConsultado = hash;
        return { id: 'u1', resetTokenExpiresAt: new Date(Date.now() + 60_000) };
      },
      atualizarSenhaEInvalidarToken: async (id, hash) => calls.push([id, hash]),
    },
    passwordHasher: { hash: async (senha) => `hash:${senha}` },
  });

  const resultado = await confirmar({ token: 'token-valido', novaSenha: 'senha-segura-123' });

  assert.deepEqual(calls, [['u1', 'hash:senha-segura-123']]);
  assert.match(tokenConsultado, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenConsultado, 'token-valido');
  assert.equal(resultado.mensagem, 'Senha redefinida com sucesso. Pode agora fazer login.');
});
