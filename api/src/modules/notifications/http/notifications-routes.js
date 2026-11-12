import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createNotificationsRouter({ requireAuth, notificacoes }) {
  const router = Router();
  const qualquerAutenticado = [requireAuth];

  router.get('/notificacoes', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const lista = await notificacoes.listar({
      utilizadorId: req.utilizador.id,
      perfil: req.utilizador.perfil,
    });
    res.json({ data: lista });
  }));

  router.patch('/notificacoes/lidas-todas', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const n = await notificacoes.marcarTodasLidas({
      utilizadorId: req.utilizador.id,
      perfil: req.utilizador.perfil,
    });
    res.json({ data: { marcadas: n } });
  }));

    router.patch('/notificacoes/:id/lida', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const ok = await notificacoes.marcarLida({
      id: req.params.id,
      utilizadorId: req.utilizador.id,
      perfil: req.utilizador.perfil,
    });
    res.json({ data: { ok } });
  }));

  return router;
}