import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createMessagingRouter({
  requireAuth,
  enviar,
  listar,
  listarConversasOs,
  ocultarConversaOs,
}) {
  const router = Router();

  router.get('/mensagens/conversas', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listarConversasOs({ utilizador: req.utilizador }) });
  }));

  router.delete('/mensagens/conversas/:ordemId', requireAuth, asyncRoute(async (req, res) => {
    await ocultarConversaOs({ ordemId: req.params.ordemId, utilizador: req.utilizador });
    res.status(204).send();
  }));

  router.get('/ordens/:id/mensagens', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listar({ ordemId: req.params.id, utilizador: req.utilizador }) });
  }));

  router.post('/ordens/:id/mensagens', requireAuth, asyncRoute(async (req, res) => {
    const resultado = await enviar({ ordemId: req.params.id, remetente: req.utilizador, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  return router;
}