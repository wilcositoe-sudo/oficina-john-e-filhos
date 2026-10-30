import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgVeiculoRepository } from '../adapters/pg-veiculo-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth } from '../../auth/http/session-middleware.js';
import { criarRegistarVeiculo } from '../use-cases/registar-veiculo.js';
import { criarListarVeiculosCliente } from '../use-cases/listar-veiculos-cliente.js';
import { criarDetalheVeiculo } from '../use-cases/detalhe-veiculo.js';

export function createVehicleRouter() {
  const router = Router();
  const veiculoRepo = criarPgVeiculoRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });

  const registar = criarRegistarVeiculo({ veiculoRepo });
  const listar = criarListarVeiculosCliente({ veiculoRepo });
  const detalhe = criarDetalheVeiculo({ veiculoRepo });

  const isStaff = (req) => ['FUNCIONARIO', 'ADMINISTRADOR'].includes(req.utilizador.perfil);

  router.post('/veiculos', requireAuth, asyncRoute(async (req, res) => {
    const resultado = await registar({ utilizadorId: req.utilizador.id, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  router.get('/veiculos', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listar({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/veiculos/:id', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await detalhe({ id: req.params.id, utilizador: req.utilizador, isStaff: isStaff(req) }) });
  }));

  return router;
}