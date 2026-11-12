import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createChatbotRouter(dependencies) {
  const router = Router();
  const {
    requireAuth,
    requireRole,
    iniciarConversa,
    enviarMensagemCliente,
    obterConversa,
    agendarDiagnostico,
    definirChegadaOficina,
    listarConversasStaff,
    atenderConversaStaff,
    responderStaff,
    definirDecisaoDiagnosticoStaff,
    fecharConversaStaff,
    converterLeadEmOs,
    listarConversasCliente,
    ocultarConversa,
  } = dependencies;
  const cliente = [requireAuth, requireRole('CLIENTE')];
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const qualquerAutenticado = [requireAuth];

  const podeVerTodas = (u) => ['FUNCIONARIO', 'ADMINISTRADOR'].includes(u?.perfil);

  // Cliente
  router.post('/chatbot/iniciar', ...cliente, asyncRoute(async (req, res) => {
    res.json({
      data: await iniciarConversa({
        utilizador: req.utilizador,
        nova: req.body?.nova === true,
      }),
    });
  }));

  router.get('/chatbot/conversas/ativa', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await iniciarConversa({ utilizador: req.utilizador }) });
  }));

  router.get('/chatbot/minhas-conversas', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await listarConversasCliente({ utilizador: req.utilizador }) });
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

  router.delete('/chatbot/conversas/:id', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    await ocultarConversa({
      conversaId: req.params.id,
      utilizador: req.utilizador,
      isStaff: podeVerTodas(req.utilizador),
    });
    res.status(204).send();
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
    res.json({ data: await listarConversasStaff({ utilizador: req.utilizador }) });
  }));

  router.delete('/chatbot/staff/conversas/:id', ...staff, asyncRoute(async (req, res) => {
    await ocultarConversa({
      conversaId: req.params.id,
      utilizador: req.utilizador,
      isStaff: true,
    });
    res.status(204).send();
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
        descricaoProblema: req.body?.descricaoProblema,
      }),
    });
  }));

  return router;
}