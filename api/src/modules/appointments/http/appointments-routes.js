import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgAgendamentoRepository } from '../adapters/pg-agendamento-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarConsultarDisponibilidade } from '../use-cases/consultar-disponibilidade.js';
import { criarAgendarDiagnostico } from '../use-cases/agendar-diagnostico.js';
import { criarCancelarAgendamento } from '../use-cases/cancelar-agendamento.js';
import { criarListarMeusAgendamentos } from '../use-cases/listar-meus-agendamentos.js';
import { criarListarAgendamentosStaff } from '../use-cases/listar-agendamentos-staff.js';

export function createAppointmentsRouter() {
  const router = Router();
  const agendamentoRepo = criarPgAgendamentoRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const autenticado = [requireAuth];

  const disponibilidade = criarConsultarDisponibilidade({ agendamentoRepo });
  const agendar = criarAgendarDiagnostico({
    agendamentoRepo,
    veiculoRepo: criarPgVeiculoRepository(),
  });
  const cancelar = criarCancelarAgendamento({ agendamentoRepo });

  router.get('/agendamentos/disponibilidade', ...autenticado, asyncRoute(async (req, res) => {
    res.json({ data: await disponibilidade({ data: req.query.data }) });
  }));

  router.post('/agendamentos', ...autenticado, asyncRoute(async (req, res) => {
    const resultado = await agendar({ utilizadorId: req.utilizador.id, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  router.get('/agendamentos/meu', ...autenticado, asyncRoute(async (req, res) => {
    const listar = criarListarMeusAgendamentos({ agendamentoRepo });
    res.json({ data: await listar({ utilizadorId: req.utilizador.id }) });
  }));

  router.get('/agendamentos', ...staff, asyncRoute(async (req, res) => {
    const listar = criarListarAgendamentosStaff({ agendamentoRepo });
    res.json({ data: await listar() });
  }));

  router.post('/agendamentos/:id/cancelar', ...autenticado, asyncRoute(async (req, res) => {
    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(req.utilizador.perfil);
    res.json({ data: await cancelar({ id: req.params.id, utilizador: req.utilizador, isStaff }) });
  }));

  return router;
}