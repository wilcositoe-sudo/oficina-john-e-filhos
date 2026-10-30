import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgVeiculoRepository } from '../adapters/pg-veiculo-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarRegistarVeiculo } from '../use-cases/registar-veiculo.js';
import { criarListarVeiculosCliente } from '../use-cases/listar-veiculos-cliente.js';
import { criarDetalheVeiculo } from '../use-cases/detalhe-veiculo.js';
import { erros } from '../../../shared/errors/domain-error.js';

export function createVehicleRouter() {
  const router = Router();
  const veiculoRepo = criarPgVeiculoRepository();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];

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

  // Staff: veículos de um cliente (para criar a OS — UI16)
  router.get('/clientes/:email/veiculos', ...staff, asyncRoute(async (req, res) => {
    const utilizador = await utilizadorRepo.procurarPorEmail(req.params.email.trim().toLowerCase());
    if (!utilizador || utilizador.perfil !== 'CLIENTE') throw erros.clienteNaoEncontrado();
    res.json({ data: await veiculoRepo.listarPorUtilizador(utilizador.id) });
  }));

  return router;
}