import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

// === Repositórios (adapters reais) ===
import { criarPgOsRepository } from '../adapters/pg-os-repository.js';
import { criarPgClienteRepository } from '../../auth/adapters/pg-cliente-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';

// === Use-cases EXISTENTES ===
import { criarCriarOS } from '../use-cases/criar-os.js';
import { criarListarOsStaff } from '../use-cases/listar-os-staff.js';
import { criarDetalheOs } from '../use-cases/detalhe-os.js';
import { criarTransitarOs } from '../use-cases/transitar-os.js';
import { criarAdicionarServico } from '../use-cases/adicionar-servico.js';
import { criarAdicionarPeca } from '../use-cases/adicionar-peca.js';
import { criarListarHistoricoOs } from '../use-cases/listar-historico-os.js';
import { criarListarMinhasOs } from '../use-cases/listar-minhas-os.js';
import { criarEscolherEntrega } from '../use-cases/escolher-entrega.js';

// === Use-cases NOVOS (F12) ===
import { criarAtribuirMecanico } from '../use-cases/atribuir-mecanico.js';
import { criarSubmeterDiagnostico } from '../use-cases/submeter-diagnostico.js';
import { criarPrecificarOS } from '../use-cases/precificar-os.js';
import { criarDecisaoCliente } from '../use-cases/decisao-cliente.js';
import { criarValidarRevisao } from '../use-cases/validar-revisao.js';

// === Middlewares ===
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';

export function createWorkOrdersRouter() {
  const router = Router();

  // --- Repositórios ---
  const osRepo = criarPgOsRepository();
  const clienteRepo = criarPgClienteRepository();
  const veiculoRepo = criarPgVeiculoRepository();
  const utilizadorRepo = criarPgUtilizadorRepository();

  // --- Middlewares de autorização ---
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const mecanico = [requireAuth, createRequireRole('MECANICO')];
  const cliente = [requireAuth, createRequireRole('CLIENTE')];
  const qualquerAutenticado = [requireAuth];

  // --- Use-cases EXISTENTES ---
  const criarOS = criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo });
  const listarOsStaff = criarListarOsStaff({ osRepo });
  const detalheOs = criarDetalheOs({ osRepo });
  const transitarOs = criarTransitarOs({ osRepo });
  const adicionarServico = criarAdicionarServico({ osRepo });
  const adicionarPeca = criarAdicionarPeca({ osRepo });
  const listarHistoricoOs = criarListarHistoricoOs({ osRepo });
  const listarMinhasOs = criarListarMinhasOs({ osRepo });
  const escolherEntrega = criarEscolherEntrega({ osRepo });

  // --- Use-cases NOVOS (F12) ---
  const atribuirMecanico = criarAtribuirMecanico({ osRepo, utilizadorRepo });
  const submeterDiagnostico = criarSubmeterDiagnostico({ osRepo });
  const precificarOS = criarPrecificarOS({ osRepo });
  const decisaoCliente = criarDecisaoCliente({ osRepo, clienteRepo });
  const validarRevisao = criarValidarRevisao({ osRepo });

  // ============================================================
  // ⚠️ ORDEM CRÍTICA: ROTAS ESTÁTICAS ANTES DAS DINÂMICAS
  // ============================================================

  // --- 1. Coleções / listas (sem parâmetro :id) ---
  router.post('/ordens', ...staff, asyncRoute(async (req, res) => {
    const resultado = await criarOS({ ...req.body, utilizador: req.utilizador });
    res.status(201).json({ data: resultado });
  }));

  router.get('/ordens', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarOsStaff(req.query ?? {}) });
  }));

  // --- 2. Rotas ESTÁTICAS específicas (DEVEM VIR ANTES de /:id) ---
  router.get('/ordens/meu', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await listarMinhasOs({ utilizador: req.utilizador }) });
  }));

  router.get('/ordens/minhas', ...mecanico, asyncRoute(async (req, res) => {
    const lista = await osRepo.listarPorMecanico(req.utilizador.id);
    res.json({ data: lista });
  }));

  // --- 3. Rota DINÂMICA genérica (:id) — SEMPRE POR ÚLTIMO ---
  router.get('/ordens/:id', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({ data: await detalheOs({ id: req.params.id, utilizador: req.utilizador }) });
  }));

  // --- 4. Sub-rotas com :id (a ordem relativa entre elas não importa, pois todas têm :id) ---
  router.post('/ordens/:id/transicoes', ...staff, asyncRoute(async (req, res) => {
    const resultado = await transitarOs({
      id: req.params.id,
      utilizador: req.utilizador,
      acao: req.body?.acao,
      motivo: req.body?.motivo,
    });
    res.json({ data: resultado });
  }));

  router.post('/ordens/:id/servicos', ...staff, asyncRoute(async (req, res) => {
    const resultado = await adicionarServico({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      ...req.body,
    });
    res.status(201).json({ data: resultado });
  }));

  router.post('/ordens/:id/pecas', ...staff, asyncRoute(async (req, res) => {
    const resultado = await adicionarPeca({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      ...req.body,
    });
    res.status(201).json({ data: resultado });
  }));

  router.get('/ordens/:id/historico', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({ data: await listarHistoricoOs({ id: req.params.id }) });
  }));

  router.post('/ordens/:id/entrega', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const resultado = await escolherEntrega({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      modalidade: req.body?.modalidade,
    });
    res.json({ data: resultado });
  }));

  // ============================================================
  // ROTAS NOVAS (F12) — todas usam :id, portanto ficam no bloco dinâmico
  // ============================================================

  router.patch('/ordens/:id/atribuir-mecanico', ...staff, asyncRoute(async (req, res) => {
    const { mecanicoId } = req.body ?? {};
    const resultado = await atribuirMecanico({
      ordemId: req.params.id,
      mecanicoId,
      utilizador: req.utilizador,
    });
    res.json({ data: resultado });
  }));

  router.post('/ordens/:id/diagnostico', ...mecanico, asyncRoute(async (req, res) => {
    const resultado = await submeterDiagnostico({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      checklist: req.body?.checklist,
      servicos: req.body?.servicos,
      pecas: req.body?.pecas,
    });
    res.json({ data: resultado });
  }));

  router.post('/ordens/:id/precificar', ...staff, asyncRoute(async (req, res) => {
    const resultado = await precificarOS({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      taxaDiagnostico: req.body?.taxaDiagnostico,
      precos: req.body?.precos,
    });
    res.json({ data: resultado });
  }));

  router.post('/ordens/:id/decisao', ...cliente, asyncRoute(async (req, res) => {
    const resultado = await decisaoCliente({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      acao: req.body?.acao,
      itensRemover: req.body?.itensRemover,
    });
    res.json({ data: resultado });
  }));

  router.post('/ordens/:id/validar-revisao', ...staff, asyncRoute(async (req, res) => {
    const resultado = await validarRevisao({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      aprovada: req.body?.aprovada ?? true,
    });
    res.json({ data: resultado });
  }));

  return router;
}