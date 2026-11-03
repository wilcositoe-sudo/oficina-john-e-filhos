import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgDashboardRepository } from '../adapters/pg-dashboard-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarCriarContaInterna } from '../use-cases/criar-conta-interna.js';
import { criarListarContasInternas } from '../use-cases/listar-contas-internas.js';
import { criarAtualizarContaInterna } from '../use-cases/atualizar-conta-interna.js';
import { criarConsultarDashboard } from '../use-cases/consultar-dashboard.js';

export function createAdminRouter() {
  const router = Router();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });
  const admin = [requireAuth, createRequireRole('ADMINISTRADOR')];

  const criarConta = criarCriarContaInterna({ utilizadorRepo });
  const listarContas = criarListarContasInternas({ utilizadorRepo });
  const atualizarConta = criarAtualizarContaInterna({ utilizadorRepo });
  const dashboard = criarConsultarDashboard({ dashboardRepo: criarPgDashboardRepository() });

  router.get('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await listarContas() });
  }));
  router.post('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    const resultado = await criarConta(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));
  router.patch('/admin/utilizadores/:id', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await atualizarConta({ id: req.params.id, ...(req.body ?? {}) }) });
  }));
  router.get('/admin/dashboard', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await dashboard({ inicio: req.query.inicio, fim: req.query.fim }) });
  }));

  return router;
}