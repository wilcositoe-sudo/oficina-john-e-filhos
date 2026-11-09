import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

import { criarPgChatbotRepository } from '../adapters/pg-chatbot-repository.js';
import {
  criarIniciarConversa,
  criarEnviarMensagemCliente,
  criarObterConversa,
  criarAgendarDiagnostico,
  criarDefinirChegadaOficina,
  criarListarConversasStaff,
  criarAtenderConversaStaff,
  criarResponderStaff,
  criarDefinirDecisaoDiagnosticoStaff,
  criarFecharConversaStaff,
  criarConverterLeadEmOs,
} from '../use-cases/chatbot-usecases.js';

import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgClienteRepository } from '../../auth/adapters/pg-cliente-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgOsRepository } from '../../work-orders/adapters/pg-os-repository.js';
import { criarCriarOS } from '../../work-orders/use-cases/criar-os.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';

export function createChatbotRouter() {
  const router = Router();

  const chatRepo = criarPgChatbotRepository();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const clienteRepo = criarPgClienteRepository();
  const veiculoRepo = criarPgVeiculoRepository();
  const osRepo = criarPgOsRepository();

  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });

  const cliente = [requireAuth, createRequireRole('CLIENTE')];
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const qualquerAutenticado = [requireAuth];

  const criarOS = criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo });

  const iniciarConversa = criarIniciarConversa({ chatRepo });
  const enviarMensagemCliente = criarEnviarMensagemCliente({ chatRepo });
  const obterConversa = criarObterConversa({ chatRepo });
  const agendarDiagnostico = criarAgendarDiagnostico({ chatRepo });
  const definirChegadaOficina = criarDefinirChegadaOficina({ chatRepo });
  const listarConversasStaff = criarListarConversasStaff({ chatRepo });
  const atenderConversaStaff = criarAtenderConversaStaff({ chatRepo });
  const responderStaff = criarResponderStaff({ chatRepo });
  const definirDecisaoDiagnosticoStaff = criarDefinirDecisaoDiagnosticoStaff({ chatRepo });
  const fecharConversaStaff = criarFecharConversaStaff({ chatRepo });
  const converterLeadEmOs = criarConverterLeadEmOs({ chatRepo, criarOS, osRepo });

  const podeVerTodas = (u) => ['FUNCIONARIO', 'ADMINISTRADOR'].includes(u?.perfil);

  // Cliente
  router.post('/chatbot/iniciar', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await iniciarConversa({ utilizador: req.utilizador }) });
  }));

  router.get('/chatbot/conversas/ativa', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await iniciarConversa({ utilizador: req.utilizador }) });
  }));

  router.post('/chatbot/mensagens', ...cliente, asyncRoute(async (req, res) => {
    res.json({
      data: await enviarMensagemCliente({
        utilizador: req.utilizador,
        conversaId: req.body?.conversaId,
        texto: req.body?.texto,
      }),
    });
  }));

  router.get('/chatbot/conversas/:id', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({
      data: await obterConversa({
        id: req.params.id,
        utilizador: req.utilizador,
        isStaff: podeVerTodas(req.utilizador),
      }),
    });
  }));

  router.post('/chatbot/conversas/:id/agendar', ...cliente, asyncRoute(async (req, res) => {
    res.json({
      data: await agendarDiagnostico({
        conversaId: req.params.id,
        utilizador: req.utilizador,
        inicioAt: req.body?.inicioAt,
        fimAt: req.body?.fimAt,
      }),
    });
  }));

  router.post('/chatbot/conversas/:id/chegada', ...cliente, asyncRoute(async (req, res) => {
    res.json({
      data: await definirChegadaOficina({
        conversaId: req.params.id,
        utilizador: req.utilizador,
        modalidade: req.body?.modalidade,
        bairro: req.body?.bairro,
        quarteirao: req.body?.quarteirao,
        numeroCasa: req.body?.numeroCasa,
        pontoReferencia: req.body?.pontoReferencia,
        lat: req.body?.lat,
        lng: req.body?.lng,
        precisao: req.body?.precisao,
      }),
    });
  }));

  // Staff
  router.get('/chatbot/staff/conversas', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarConversasStaff() });
  }));

  router.post('/chatbot/staff/conversas/:id/atender', ...staff, asyncRoute(async (req, res) => {
    res.json({
      data: await atenderConversaStaff({
        conversaId: req.params.id,
        utilizador: req.utilizador,
      }),
    });
  }));

  router.post('/chatbot/staff/conversas/:id/mensagens', ...staff, asyncRoute(async (req, res) => {
    res.json({
      data: await responderStaff({
        conversaId: req.params.id,
        utilizador: req.utilizador,
        conteudo: req.body?.conteudo,
      }),
    });
  }));

  // ★ Fase 3C — funcionário marca decisão de diagnóstico.
  router.post(
    '/chatbot/staff/conversas/:id/decisao-diagnostico',
    ...staff,
    asyncRoute(async (req, res) => {
      res.json({
        data: await definirDecisaoDiagnosticoStaff({
          conversaId: req.params.id,
          utilizador: req.utilizador,
          querDiagnostico: req.body?.querDiagnostico,
        }),
      });
    }),
  );

  router.post('/chatbot/staff/conversas/:id/fechar', ...staff, asyncRoute(async (req, res) => {
    res.json({
      data: await fecharConversaStaff({
        conversaId: req.params.id,
        utilizador: req.utilizador,
      }),
    });
  }));

  router.post('/chatbot/staff/conversas/:id/converter', ...staff, asyncRoute(async (req, res) => {
    res.json({
      data: await converterLeadEmOs({
        conversaId: req.params.id,
        utilizador: req.utilizador,
      }),
    });
  }));

  return router;
}