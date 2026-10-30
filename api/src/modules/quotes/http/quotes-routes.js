import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgOrcamentoRepository } from '../adapters/pg-orcamento-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarSolicitarOrcamento } from '../use-cases/solicitar-orcamento.js';
import { criarListarOrcamentosCliente } from '../use-cases/listar-orcamentos-cliente.js';
import { criarListarOrcamentosStaff } from '../use-cases/listar-orcamentos-staff.js';
import { criarResponderOrcamento } from '../use-cases/responder-orcamento.js';
import { criarDecidirOrcamento } from '../use-cases/decidir-orcamento.js';

export function createQuotesRouter() {
  const router = Router();
  const orcamentoRepo = criarPgOrcamentoRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const cliente = [requireAuth, createRequireRole('CLIENTE')];

  const solicitar = criarSolicitarOrcamento({
    orcamentoRepo,
    veiculoRepo: criarPgVeiculoRepository(),
  });

  router.post('/orcamentos', ...cliente, asyncRoute(async (req, res) => {
    const resultado = await solicitar({ utilizadorId: req.utilizador.id, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  router.get('/orcamentos/meu', ...cliente, asyncRoute(async (req, res) => {
    const listar = criarListarOrcamentosCliente({ orcamentoRepo });
    res.json({ data: await listar({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/orcamentos', ...staff, asyncRoute(async (req, res) => {
    const listar = criarListarOrcamentosStaff({ orcamentoRepo });
    res.json({ data: await listar() });
  }));

  router.post('/orcamentos/:id/resposta', ...staff, asyncRoute(async (req, res) => {
    const responder = criarResponderOrcamento({ orcamentoRepo });
    res.json({ data: await responder({ id: req.params.id, ...(req.body ?? {}) }) });
  }));

  router.post('/orcamentos/:id/decisao', ...cliente, asyncRoute(async (req, res) => {
    const decidir = criarDecidirOrcamento({ orcamentoRepo });
    res.json({ data: await decidir({ id: req.params.id, utilizador: req.utilizador, ...(req.body ?? {}) }) });
  }));

  return router;
}