import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
export function createRatingsRouter({ requireAuth, requireRole, avaliar, listarPublicas, moderar }) {
  const router = Router();
  const admin = [requireAuth, requireRole('ADMINISTRADOR')];
  const cliente = [requireAuth, requireRole('CLIENTE')];

  // RF08 — cliente avalia a sua OS entregue
  router.post('/ordens/:id/avaliacoes', ...cliente, asyncRoute(async (req, res) => {
    const resultado = await avaliar({ ordemId: req.params.id, utilizador: req.utilizador, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  // RF09 — público: avaliações publicadas
  router.get('/avaliacoes', asyncRoute(async (req, res) => {
    res.json({ data: await listarPublicas() });
  }));

  // NOVO: F12 — Admin modera avaliações
  router.get('/admin/avaliacoes', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await moderar.listar() });
  }));

  router.patch('/admin/avaliacoes/:id', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await moderar.atualizarPublicacao({
        id: req.params.id,
        publicada: req.body?.publicada,
      }),
    });
  }));

  return router;
}