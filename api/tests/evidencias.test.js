import assert from 'node:assert/strict';
import test from 'node:test';
import { criarGerirEvidencias } from '../src/modules/work-orders/use-cases/gerir-evidencias.js';

test('evidencias only allow a mechanic to access their own work order', async () => {
  const gerir = criarGerirEvidencias({
    evidenciaRepo: {
      procurarAcessoOs: async () => ({
        mecanicoId: 'm1',
        estado: 'EM_REPARACAO',
      }),
      listarPorOrdem: async () => [],
    },
  });

  const resultado = await gerir.listar({
    ordemId: 'os1',
    utilizador: { id: 'm2', perfil: 'MECANICO' },
  });

  assert.deepEqual(resultado, {
    erro: {
      status: 403,
      codigo: 'NAO_AUTORIZADO',
      mensagem: 'Esta OS não pertence a este mecânico.',
    },
  });
});

test('evidencias upload normalizes optional metadata and records the mechanic', async () => {
  let dadosCriados;
  const gerir = criarGerirEvidencias({
    evidenciaRepo: {
      procurarAcessoOs: async () => ({
        mecanicoId: 7,
        estado: 'EM_DIAGNOSTICO',
      }),
      criar: async (dados) => {
        dadosCriados = dados;
        return { id: 1, ...dados };
      },
    },
  });

  await gerir.registar({
    ordemId: 'os1',
    utilizador: { id: '7', perfil: 'MECANICO' },
    ficheiro: { mimetype: 'image/png', size: 120 },
    tipo: 'tipo-invalido',
    referenciaId: 'nao-numerico',
    legenda: '  Evidência  ',
    url: '/uploads/evidencias/file.png',
  });

  assert.deepEqual(dadosCriados, {
    ordemId: 'os1',
    tipo: 'GERAL',
    referenciaId: null,
    url: '/uploads/evidencias/file.png',
    mimeType: 'image/png',
    tamanho: 120,
    legenda: 'Evidência',
    mecanicoId: '7',
  });
});

test('mechanics cannot upload evidence after the work order leaves repair states', async () => {
  const gerir = criarGerirEvidencias({
    evidenciaRepo: {
      procurarAcessoOs: async () => ({
        mecanicoId: 'm1',
        estado: 'CONCLUIDA',
      }),
      criar: async () => assert.fail('não deve criar evidência'),
    },
  });

  const resultado = await gerir.registar({
    ordemId: 'os1',
    utilizador: { id: 'm1', perfil: 'MECANICO' },
    ficheiro: { mimetype: 'image/png', size: 120 },
    url: '/uploads/evidencias/file.png',
  });

  assert.equal(resultado.erro.status, 409);
  assert.equal(resultado.erro.codigo, 'OS_NAO_PERMITE_EVIDENCIAS');
});

test('upload access is checked before accepting a file', async () => {
  const gerir = criarGerirEvidencias({
    evidenciaRepo: {
      procurarAcessoOs: async () => ({
        mecanicoId: 'm1',
        estado: 'EM_REPARACAO',
      }),
    },
  });

  const resultado = await gerir.verificarAcessoEscrita({
    ordemId: 'os1',
    utilizador: { id: 'm2', perfil: 'MECANICO' },
  });

  assert.equal(resultado.erro.status, 403);
  assert.equal(resultado.erro.codigo, 'NAO_AUTORIZADO');
});
