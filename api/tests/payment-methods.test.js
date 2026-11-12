import assert from 'node:assert/strict';
import test from 'node:test';
import { criarRegistarPagamento } from '../src/modules/payments/use-cases/registar-pagamento.js';

const METODOS = ['MPESA', 'EMOLA', 'MKESH', 'CONTA_BANCARIA'];

test('digital payment options are preserved as simulated pending payments', async () => {
  const providerCalls = [];
  const storedPayments = [];
  const registar = criarRegistarPagamento({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        utilizadorId: 'u1',
        estado: 'CONCLUIDA',
        valorTotal: 1250,
      }),
    },
    pagamentoRepo: {
      procurarPorChaveIdempotencia: async () => null,
      criar: async (pagamento) => {
        storedPayments.push(pagamento);
        return pagamento;
      },
    },
    provider: {
      createPayment: async (dados) => {
        providerCalls.push(dados);
        return { referenciaFornecedor: `FAKE-${dados.metodo}` };
      },
    },
    confirmacao: async () => assert.fail('pagamento simulado não deve confirmar automaticamente'),
  });

  for (const metodo of METODOS) {
    const pagamento = await registar({
      ordemId: 'os1',
      utilizador: { id: 'u1', perfil: 'CLIENTE' },
      metodo,
      idempotencyKey: `key-${metodo}`,
    });
    assert.equal(pagamento.metodo, metodo);
    assert.equal(pagamento.estado, 'PENDENTE');
  }

  assert.deepEqual(providerCalls.map((dados) => dados.metodo), METODOS);
  assert.deepEqual(storedPayments.map((pagamento) => pagamento.metodo), METODOS);
});

test('digital payment rejects unsupported methods', async () => {
  const registar = criarRegistarPagamento({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        utilizadorId: 'u1',
        estado: 'CONCLUIDA',
        valorTotal: 1250,
      }),
    },
    pagamentoRepo: {},
    provider: {},
    confirmacao: async () => {},
  });

  await assert.rejects(
    registar({
      ordemId: 'os1',
      utilizador: { id: 'u1', perfil: 'CLIENTE' },
      metodo: 'UNSUPPORTED',
    }),
    (error) => error.code === 'VALIDACAO' && error.status === 422,
  );
});
