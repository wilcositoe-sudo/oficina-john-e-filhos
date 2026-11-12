import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createQuotesRouter({
  casosDeUso,
  requireAuth,
  requireRole,
}) {
  const router = Router();
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const cliente = [requireAuth, requireRole('CLIENTE')];

  const { solicitar, listarCliente, listarStaff, responder, decidir } = casosDeUso;

  router.post('/orcamentos', ...cliente, asyncRoute(async (req, res) => {
    res.status(201).json({
      data: await solicitar({
        utilizadorId: req.utilizador.id,
        ...(req.body ?? {}),
      }),
    });
  }));

  router.get('/orcamentos/meu', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await listarCliente({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/orcamentos', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarStaff() });
  }));

  router.post('/orcamentos/:id/resposta', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await responder({ id: req.params.id, ...(req.body ?? {}) }) });
  }));

  router.post('/orcamentos/:id/decisao', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await decidir({ id: req.params.id, utilizador: req.utilizador, ...(req.body ?? {}) }) });
  }));

  return router;
}