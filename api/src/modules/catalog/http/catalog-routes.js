import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgServicoRepository } from '../adapters/pg-servico-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarListarServicosPublico } from '../use-cases/listar-servicos-publico.js';
import { criarCriarServico } from '../use-cases/criar-servico.js';
import { criarDesativarServico } from '../use-cases/desativar-servico.js';

export function createCatalogRouter() {
  const router = Router();
  const servicoRepo = criarPgServicoRepository();
  const sessaoRepo = criarPgSessaoRepository();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const requireAuth = createRequireAuth({ sessaoRepo, utilizadorRepo });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];

  const listar = criarListarServicosPublico({ servicoRepo });
  const criar = criarCriarServico({ servicoRepo });
  const desativar = criarDesativarServico({ servicoRepo });

  router.get('/servicos', asyncRoute(async (req, res) => {
    res.json({ data: await listar() });
  }));

  // Gestão: só staff (RF01/RF18 — decisão de permissão a validar com a oficina)
  router.post('/servicos', ...staff, asyncRoute(async (req, res) => {
    const resultado = await criar(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  router.patch('/servicos/:id/desativar', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await desativar(req.params.id) });
  }));

  return router;
}