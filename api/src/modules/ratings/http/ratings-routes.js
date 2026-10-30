import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgAvaliacaoRepository } from '../adapters/pg-avaliacao-repository.js';
import { criarPgOsRepository } from '../../work-orders/adapters/pg-os-repository.js';
import { criarPgClienteRepository } from '../../auth/adapters/pg-cliente-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarAvaliarOs } from '../use-cases/avaliar-os.js';
import { criarListarAvaliacoesPublicas } from '../use-cases/listar-avaliacoes-publicas.js';

export function createRatingsRouter() {
  const router = Router();
  const avaliacaoRepo = criarPgAvaliacaoRepository();
  const osRepo = criarPgOsRepository();
  const clienteRepo = criarPgClienteRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });
  const cliente = [requireAuth, createRequireRole('CLIENTE')];

  const avaliar = criarAvaliarOs({ avaliacaoRepo, osRepo, clienteRepo });
  const listarPublicas = criarListarAvaliacoesPublicas({ avaliacaoRepo });

  // RF08 — cliente avalia a sua OS entregue
  router.post('/ordens/:id/avaliacoes', ...cliente, asyncRoute(async (req, res) => {
    const resultado = await avaliar({ ordemId: req.params.id, utilizador: req.utilizador, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  // RF09 — público: avaliações publicadas (sem dados privados)
  router.get('/avaliacoes', asyncRoute(async (req, res) => {
    res.json({ data: await listarPublicas() });
  }));

  return router;
}