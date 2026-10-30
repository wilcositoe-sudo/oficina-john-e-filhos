import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgOsRepository } from '../adapters/pg-os-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgClienteRepository } from '../../auth/adapters/pg-cliente-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarCriarOS } from '../use-cases/criar-os.js';
import { criarDetalheOs } from '../use-cases/detalhe-os.js';
import { criarListarMinhasOs } from '../use-cases/listar-minhas-os.js';
import { criarListarOsStaff } from '../use-cases/listar-os-staff.js';
import { criarListarHistoricoOs } from '../use-cases/listar-historico-os.js';

export function createWorkOrdersRouter() {
  const router = Router();
  const osRepo = criarPgOsRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const autenticado = [requireAuth];

  const criar = criarCriarOS({
    osRepo,
    utilizadorRepo: criarPgUtilizadorRepository(),
    clienteRepo: criarPgClienteRepository(),
    veiculoRepo: criarPgVeiculoRepository(),
  });
  const detalhe = criarDetalheOs({ osRepo });
  const listarMinhas = criarListarMinhasOs({ osRepo });
  const listarStaff = criarListarOsStaff({ osRepo });
  const historico = criarListarHistoricoOs({ osRepo });

  const isStaff = (req) => ['FUNCIONARIO', 'ADMINISTRADOR'].includes(req.utilizador.perfil);

  // RN02: o corpo nunca traz estado — o servidor impõe PENDENTE
  router.post('/ordens', ...staff, asyncRoute(async (req, res) => {
    const resultado = await criar({ funcionarioId: req.utilizador.id, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  router.get('/ordens/meu', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await listarMinhas({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/ordens', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarStaff() });
  }));

  router.get('/ordens/:id', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await detalhe({ id: req.params.id, utilizador: req.utilizador, isStaff: isStaff(req) }) });
  }));

  router.get('/ordens/:id/historico', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await historico({ id: req.params.id, utilizador: req.utilizador, isStaff: isStaff(req) }) });
  }));

  return router;
}