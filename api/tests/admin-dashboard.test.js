import assert from 'node:assert/strict';
import test from 'node:test';
import { criarConsultarDashboard } from '../src/modules/admin/use-cases/consultar-dashboard.js';

test('dashboard rejects malformed date filters instead of silently changing the report period', async () => {
  let consulted = false;
  const consultar = criarConsultarDashboard({
    dashboardRepo: {
      consultar: async () => {
        consulted = true;
        return {};
      },
    },
  });

  await assert.rejects(
    consultar({ inicio: 'data-inválida', fim: '2025-03-20T23:59:59.999Z' }),
    (error) => error.code === 'PERIODO_INVALIDO' && error.status === 422,
  );
  assert.equal(consulted, false);
});

test('dashboard rejects empty or reversed date filters', async () => {
  const consultar = criarConsultarDashboard({
    dashboardRepo: { consultar: async () => assert.fail('não deve consultar um período inválido') },
  });

  await assert.rejects(
    consultar({ inicio: '', fim: '2025-03-20T23:59:59.999Z' }),
    (error) => error.code === 'PERIODO_INVALIDO' && error.status === 422,
  );
  await assert.rejects(
    consultar({ inicio: '2025-03-21T00:00:00.000Z', fim: '2025-03-20T23:59:59.999Z' }),
    (error) => error.code === 'PERIODO_INVALIDO' && error.status === 422,
  );
});

test('dashboard sends the exact requested interval to its repository', async () => {
  let periodo;
  const consultar = criarConsultarDashboard({
    dashboardRepo: {
      consultar: async (dados) => {
        periodo = dados;
        return { totalOS: 3 };
      },
    },
  });

  const result = await consultar({
    inicio: '2025-03-01T00:00:00.000Z',
    fim: '2025-03-05T23:59:59.999Z',
  });

  assert.equal(periodo.inicio, '2025-03-01T00:00:00.000Z');
  assert.equal(periodo.fim, '2025-03-05T23:59:59.999Z');
  assert.deepEqual(result, { totalOS: 3 });
});
