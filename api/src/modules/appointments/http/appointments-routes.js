import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createAppointmentsRouter({
  requireAuth,
  requireRole,
  disponibilidade,
  agendar,
  cancelar,
  listarMeus,
  listarStaff,
}) {
  const router = Router();
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const autenticado = [requireAuth];

  router.get('/agendamentos/disponibilidade', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await disponibilidade({ data: req.query.data }) });
  }));

  router.post('/agendamentos', ...autenticado, asyncRoute(async (req, res) => {
    const resultado = await agendar({ utilizadorId: req.utilizador.id, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  router.get('/agendamentos/meu', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await listarMeus({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/agendamentos', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarStaff() });
  }));

  router.post('/agendamentos/:id/cancelar', ...autenticado, asyncRoute(async (req, res) => {
    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(req.utilizador.perfil);
    res.json({ data: await cancelar({ id: req.params.id, utilizador: req.utilizador, isStaff }) });
  }));

  return router;
}