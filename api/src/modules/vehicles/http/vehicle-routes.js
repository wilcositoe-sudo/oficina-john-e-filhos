import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
export function createVehicleRouter({
  requireAuth,
  requireRole,
  registar,
  listar,
  detalhe,
  listarPorCliente,
  atualizar,
}) {
  const router = Router();
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];

  const isStaff = (req) => ['FUNCIONARIO', 'ADMINISTRADOR'].includes(req.utilizador.perfil);

  router.post('/veiculos', requireAuth, asyncRoute(async (req, res) => {
    const resultado = await registar({ ...(req.body ?? {}), utilizadorId: req.utilizador.id });
    res.status(201).json({ data: resultado });
  }));

  router.get('/veiculos', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listar({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/veiculos/:id', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await detalhe({ id: req.params.id, utilizador: req.utilizador, isStaff: isStaff(req) }) });
  }));

  router.patch('/veiculos/:id', requireAuth, asyncRoute(async (req, res) => {
    res.json({
      data: await atualizar({
        ...(req.body ?? {}),
        id: req.params.id,
        utilizador: req.utilizador,
      }),
    });
  }));

  // Staff: veículos de um cliente (para criar a OS — UI16)
  router.get('/clientes/:email/veiculos', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarPorCliente({ email: req.params.email }) });
  }));

  return router;
}