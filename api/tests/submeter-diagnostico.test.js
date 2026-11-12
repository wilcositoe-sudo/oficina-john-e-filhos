import assert from 'node:assert/strict';
import test from 'node:test';
import { criarSubmeterDiagnostico } from '../src/modules/work-orders/use-cases/submeter-diagnostico.js';

test('invalid diagnostic items do not persist checklist or earlier valid items', async () => {
  const writes = [];
  const submeterDiagnostico = criarSubmeterDiagnostico({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        mecanicoId: 'm1',
        estado: 'EM_DIAGNOSTICO',
      }),
      submeterDiagnostico: async () => writes.push('diagnostico'),
    },
    servicoRepo: {
      procurarPorId: async (id) => ({ id, nome: 'Serviço ativo', ativo: true }),
    },
    pecaRepo: {
      procurarPorId: async () => ({ id: 'p1', nome: 'Peça inativa', ativo: false }),
    },
  });

  await assert.rejects(
    submeterDiagnostico({
      ordemId: 'os1',
      utilizador: { id: 'm1', perfil: 'MECANICO' },
      checklist: [{ item: 'Motor', estado: 'OK' }],
      servicos: [{ servicoId: 's1', quantidade: 1 }],
      pecas: [{ pecaId: 'p1', quantidade: 1 }],
    }),
    { code: 'CONTA_INTERNA_INVALIDA', status: 422 },
  );
  assert.deepEqual(writes, []);
});

test('valid diagnostic is committed through one repository operation', async () => {
  let submission;
  const submeterDiagnostico = criarSubmeterDiagnostico({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        mecanicoId: 'm1',
        estado: 'EM_DIAGNOSTICO',
      }),
      submeterDiagnostico: async (dados) => {
        submission = dados;
        return { id: 'os1', estado: dados.estado };
      },
    },
    servicoRepo: {
      procurarPorId: async (id) => ({ id, nome: 'Revisão', ativo: true }),
    },
    pecaRepo: {
      procurarPorId: async (id) => ({ id, nome: 'Filtro', ativo: true }),
    },
  });

  await submeterDiagnostico({
    ordemId: 'os1',
    utilizador: { id: 'm1', perfil: 'MECANICO' },
    checklist: [{ item: 'Motor', estado: 'OK' }],
    servicos: [{ servicoId: '1', quantidade: 2 }],
    pecas: [{ pecaId: '2', quantidade: 1 }],
  });

  assert.deepEqual(submission, {
    ordemId: 'os1',
    mecanicoId: 'm1',
    checklist: [{ item: 'Motor', estado: 'OK' }],
    servicos: [{
      ordemId: 'os1',
      servicoId: 1,
      quantidade: 2,
      descricaoSnapshot: 'Revisão',
      origem: 'CATALOGO',
    }],
    pecas: [{
      ordemId: 'os1',
      pecaId: 2,
      quantidade: 1,
      descricaoSnapshot: 'Filtro',
      origem: 'CATALOGO',
    }],
    estadoAnterior: 'EM_DIAGNOSTICO',
    estado: 'AGUARDANDO_PRECO_FUNCIONARIO',
    utilizadorId: 'm1',
    motivo: 'Diagnóstico concluído pelo mecânico',
  });
});
