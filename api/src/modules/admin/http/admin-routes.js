import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgDashboardRepository } from '../adapters/pg-dashboard-repository.js';
import { criarPgAvaliacaoRepository } from '../../ratings/adapters/pg-avaliacao-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarCriarContaInterna } from '../use-cases/criar-conta-interna.js';
import { criarListarContasInternas } from '../use-cases/listar-contas-internas.js';
import { criarAtualizarContaInterna } from '../use-cases/atualizar-conta-interna.js';
import { criarConsultarDashboard } from '../use-cases/consultar-dashboard.js';

export function createAdminRouter() {
  const router = Router();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const dashboardRepo = criarPgDashboardRepository();
  const avaliacaoRepo = criarPgAvaliacaoRepository();

  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });
  const admin = [requireAuth, createRequireRole('ADMINISTRADOR')];

  const criarConta = criarCriarContaInterna({ utilizadorRepo });
  const listarContas = criarListarContasInternas({ utilizadorRepo });
  const atualizarConta = criarAtualizarContaInterna({ utilizadorRepo });
  const dashboard = criarConsultarDashboard({ dashboardRepo });

  // --- Contas Internas ---
  router.get('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await listarContas({ utilizador: req.utilizador }) });
  }));

  router.post('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    const resultado = await criarConta({ ...(req.body ?? {}), utilizador: req.utilizador });
    res.status(201).json({ data: resultado });
  }));

  router.patch('/admin/utilizadores/:id', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await atualizarConta({ id: req.params.id, ...(req.body ?? {}), utilizador: req.utilizador }),
    });
  }));

  // --- Dashboard ---
  router.get('/admin/dashboard', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await dashboard({ inicio: req.query.inicio, fim: req.query.fim, utilizador: req.utilizador }),
    });
  }));

  // --- Moderação de Avaliações (F12) ---
  router.get('/admin/avaliacoes', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await avaliacaoRepo.listarTodas() });
  }));

  router.patch('/admin/avaliacoes/:id', ...admin, asyncRoute(async (req, res) => {
    const { publicada } = req.body ?? {};
    if (typeof publicada !== 'boolean') {
      return res.status(422).json({
        error: { code: 'VALIDACAO', message: 'Campo "publicada" é obrigatório e deve ser booleano.' },
      });
    }
    const resultado = await avaliacaoRepo.atualizarPublicacao({ id: req.params.id, publicada });
    if (!resultado) {
      return res.status(404).json({ error: { code: 'NAO_ENCONTRADO', message: 'Avaliação não encontrada.' } });
    }
    res.json({ data: resultado });
  }));

  return router;
}