import assert from 'node:assert/strict';
import test from 'node:test';
import { criarAtribuirMecanico } from '../src/modules/work-orders/use-cases/atribuir-mecanico.js';
import { criarIniciarDiagnostico } from '../src/modules/work-orders/use-cases/iniciar-diagnostico.js';
import { criarTransitarOsStaff } from '../src/modules/work-orders/use-cases/transitar-os-staff.js';
import { criarConcluirReparacao } from '../src/modules/work-orders/use-cases/concluir-reparacao.js';
import { criarCriarOS } from '../src/modules/work-orders/use-cases/criar-os.js';
import { criarEscolherEntrega } from '../src/modules/work-orders/use-cases/escolher-entrega.js';
import { podeTransitar, ESTADOS_OS } from '../src/modules/work-orders/domain/estados.js';

test('work-order state graph allows only declared transitions', () => {
  assert.equal(
    podeTransitar(ESTADOS_OS.AGUARDANDO_DIAGNOSTICO, ESTADOS_OS.EM_DIAGNOSTICO),
    true,
  );
  assert.equal(
    podeTransitar(ESTADOS_OS.AGUARDANDO_APROVACAO_CLIENTE, ESTADOS_OS.AGUARDANDO_REPARACAO),
    false,
  );
  assert.equal(podeTransitar(ESTADOS_OS.ENTREGUE, ESTADOS_OS.PAGA), false);
});

test('mechanic assignment rejects a stale state and does not report success', async () => {
  const atribuirMecanico = criarAtribuirMecanico({
    utilizadorRepo: {
      procurarPorId: async () => ({ id: 'm1', perfil: 'MECANICO', ativo: true }),
    },
    osRepo: {
      procurarPorId: async () => ({ id: 'os1', estado: 'PENDENTE', mecanicoId: null }),
      atribuirMecanico: async (dados) => {
        assert.equal(dados.estadoAnterior, 'PENDENTE');
        assert.equal(dados.estadoNovo, 'AGUARDANDO_DIAGNOSTICO');
        return null;
      },
    },
  });

  await assert.rejects(
    atribuirMecanico({
      ordemId: 'os1',
      mecanicoId: 'm1',
      utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
    }),
    { code: 'TRANSICAO_INVALIDA', status: 409 },
  );
});

test('work-order creation records the authenticated staff member, not the client', async () => {
  let dadosCriados;
  const criarOS = criarCriarOS({
    utilizadorRepo: {
      procurarPorEmail: async () => ({
        id: 'cliente-user',
        perfil: 'CLIENTE',
        ativo: true,
      }),
    },
    clienteRepo: {
      procurarPorUtilizadorId: async () => ({ id: 'cliente1' }),
    },
    veiculoRepo: {
      procurarPorId: async () => ({
        id: 'veiculo1',
        utilizadorId: 'cliente-user',
      }),
    },
    osRepo: {
      criar: async (dados) => {
        dadosCriados = dados;
        return { id: 'os1', estado: 'PENDENTE' };
      },
    },
  });

  await criarOS({
    utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
    funcionarioId: 'spoofed',
    emailCliente: 'cliente@example.test',
    veiculoId: 'veiculo1',
    descricaoProblema: 'Ruído no motor ao acelerar',
  });

  assert.equal(dadosCriados.funcionarioId, 'staff1');
});

test('starting diagnosis uses an expected state and rejects a concurrent transition', async () => {
  const iniciarDiagnostico = criarIniciarDiagnostico({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        mecanicoId: 'm1',
        estado: 'AGUARDANDO_DIAGNOSTICO',
      }),
      atualizarEstado: async (dados) => {
        assert.equal(dados.estadoAnterior, 'AGUARDANDO_DIAGNOSTICO');
        return null;
      },
    },
  });

  await assert.rejects(
    iniciarDiagnostico({
      ordemId: 'os1',
      utilizador: { id: 'm1', perfil: 'MECANICO' },
    }),
    { code: 'TRANSICAO_INVALIDA', status: 409 },
  );
});

test('mechanic cannot conclude a work order without a service line', async () => {
  let transitionCalled = false;
  const concluirReparacao = criarConcluirReparacao({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        mecanicoId: 'm1',
        estado: 'EM_REPARACAO',
      }),
      contarServicos: async () => 0,
      atualizarEstado: async () => {
        transitionCalled = true;
      },
    },
  });

  await assert.rejects(
    concluirReparacao({
      ordemId: 'os1',
      utilizador: { id: 'm1', perfil: 'MECANICO' },
    }),
    { code: 'RN04_SEM_SERVICO', status: 409 },
  );
  assert.equal(transitionCalled, false);
});

test('delivery modality can be selected after repair completion and before payment', async () => {
  let entregaRegistada;
  const escolherEntrega = criarEscolherEntrega({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        estado: 'CONCLUIDA',
        utilizadorId: 'cliente1',
      }),
      definirEntrega: async (dados) => {
        entregaRegistada = dados;
        return { id: 'os1', estado: 'CONCLUIDA', modalidadeEntrega: dados.modalidade };
      },
    },
  });

  const resultado = await escolherEntrega({
    ordemId: 'os1',
    utilizador: { id: 'cliente1', perfil: 'CLIENTE' },
    modalidade: 'DOMICILIO',
    enderecoEntrega: 'Bairro Central, casa 12',
    lat: -16.1,
    lng: 33.6,
  });

  assert.deepEqual(entregaRegistada, {
    ordemId: 'os1',
    estadoEsperado: 'CONCLUIDA',
    modalidade: 'DOMICILIO',
    taxaEntrega: '500.00',
    enderecoEntrega: 'Bairro Central, casa 12',
    entregaLat: -16.1,
    entregaLng: 33.6,
  });
  assert.equal(resultado.modalidadeEntrega, 'DOMICILIO');
});

test('home delivery requires an address and validates optional coordinates', async () => {
  const escolherEntrega = criarEscolherEntrega({
    osRepo: {
      procurarPorId: async () => ({ id: 'os1', estado: 'CONCLUIDA', utilizadorId: 'cliente1' }),
      definirEntrega: async () => assert.fail('não deve guardar coordenadas inválidas'),
    },
  });

  await assert.rejects(
    escolherEntrega({
      ordemId: 'os1',
      utilizador: { id: 'cliente1', perfil: 'CLIENTE' },
      modalidade: 'DOMICILIO',
    }),
    { code: 'VALIDACAO', status: 422 },
  );
  await assert.rejects(
    escolherEntrega({
      ordemId: 'os1',
      utilizador: { id: 'cliente1', perfil: 'CLIENTE' },
      modalidade: 'DOMICILIO',
      enderecoEntrega: 'Rua 1, casa 3',
      lat: -16.1,
      lng: 220,
    }),
    { code: 'VALIDACAO', status: 422 },
  );
});

test('delivery modality cannot be changed after payment', async () => {
  let definirEntregaChamado = false;
  const escolherEntrega = criarEscolherEntrega({
    osRepo: {
      procurarPorId: async () => ({
        id: 'os1',
        estado: 'PAGA',
        utilizadorId: 'cliente1',
      }),
      definirEntrega: async () => {
        definirEntregaChamado = true;
      },
    },
  });

  await assert.rejects(
    escolherEntrega({
      ordemId: 'os1',
      utilizador: { id: 'cliente1', perfil: 'CLIENTE' },
      modalidade: 'LEVANTAMENTO',
    }),
    { code: 'TRANSICAO_INVALIDA', status: 409 },
  );
  assert.equal(definirEntregaChamado, false);
});

test('staff generic transition endpoint cannot execute client decisions', async () => {
  let transitionCalled = false;
  const transitarOsStaff = criarTransitarOsStaff({
    osRepo: { procurarPorId: async () => ({ id: 'os1', mecanicoId: null }) },
    transitarOs: async () => {
      transitionCalled = true;
    },
  });

  await assert.rejects(
    transitarOsStaff({
      id: 'os1',
      utilizador: { id: 'staff1', perfil: 'FUNCIONARIO' },
      acao: 'aprovar_cliente',
    }),
    { code: 'NAO_AUTORIZADO', status: 403 },
  );
  assert.equal(transitionCalled, false);
});
