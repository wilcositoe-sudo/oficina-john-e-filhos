import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

// === Repositórios (adapters reais do projeto) ===
import { criarPgOsRepository } from '../adapters/pg-os-repository.js';
import { criarPgClienteRepository } from '../../auth/adapters/pg-cliente-repository.js';
import { criarPgVeiculoRepository } from '../../vehicles/adapters/pg-veiculo-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';

// === Use-cases EXISTENTES (F7/F10) ===
import { criarCriarOS } from '../use-cases/criar-os.js';
import { criarListarOsStaff } from '../use-cases/listar-os-staff.js';
import { criarDetalheOs } from '../use-cases/detalhe-os.js';
import { criarTransitarOs } from '../use-cases/transitar-os.js';
import { criarAdicionarServico } from '../use-cases/adicionar-servico.js';
import { criarAdicionarPeca } from '../use-cases/adicionar-peca.js';
import { criarListarHistoricoOs } from '../use-cases/listar-historico-os.js';
import { criarListarMinhasOs } from '../use-cases/listar-minhas-os.js';
import { criarEscolherEntrega } from '../use-cases/escolher-entrega.js';

// === Use-cases NOVOS (F12 — fluxo Mecânico / Funcionário / Cliente) ===
import { criarAtribuirMecanico } from '../use-cases/atribuir-mecanico.js';
import { criarSubmeterDiagnostico } from '../use-cases/submeter-diagnostico.js';
import { criarPrecificarOS } from '../use-cases/precificar-os.js';
import { criarDecisaoCliente } from '../use-cases/decisao-cliente.js';
import { criarValidarRevisao } from '../use-cases/validar-revisao.js';
// ★ Fase 2A — ações exclusivas do mecânico
import { criarIniciarDiagnostico } from '../use-cases/iniciar-diagnostico.js';
import { criarConcluirReparacao } from '../use-cases/concluir-reparacao.js';

// === Middlewares de autenticação/autorização ===
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';

export function createWorkOrdersRouter() {
  const router = Router();

  // ------------------------------------------------------------
  // Repositórios (instanciados UMA vez por processo)
  // ------------------------------------------------------------
  const osRepo = criarPgOsRepository();
  const clienteRepo = criarPgClienteRepository();
  const veiculoRepo = criarPgVeiculoRepository();
  const utilizadorRepo = criarPgUtilizadorRepository();

  // ------------------------------------------------------------
  // Middlewares de autorização por perfil
  // ------------------------------------------------------------
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo,
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const mecanico = [requireAuth, createRequireRole('MECANICO')];
  const cliente = [requireAuth, createRequireRole('CLIENTE')];
  const qualquerAutenticado = [requireAuth];

  // ★ F12-CORREÇÃO (1/3) — helper de autorização de LEITURA de OS.
  // O use-case detalheOs/listarHistoricoOs só conhece dois modos: "isStaff" (vê
  // tudo) ou "dono" (os.utilizadorId === utilizador.id). Ora, utilizadorId é o
  // DONO da OS (o cliente), NÃO o mecânico. Logo, sem isStaff, o MECÂNICO fica
  // BLOQUEADO de abrir o detalhe das próprias OS (403), porque o id dele nunca
  // bate com o utilizadorId do cliente. Isso parte o fluxo de diagnóstico.
  //
  // TRADEOFF MVP (documentado, dívida técnica): damos isStaff=true também ao
  // MECANICO, para ele conseguir ver detalhe/histórico/checklist das OS em
  // trabalho. Consequência: o mecânico consegue ler o detalhe de QUALQUER OS,
  // não só as atribuídas a ele. Aceitável em oficina pequena. O invariante
  // "mecânico nunca vê PREÇOS" mantém-se, porque preços só vêm de /:id/linhas
  // (rota separada que o mecânico não consome) — o detalhe mostra valorTotal,
  // que em diagnóstico é 0.
  //
  // EVOLUÇÃO correta (quando sair do MVP): mudar o detalheOs para aceitar
  // os.mecanicoId === utilizador.id como terceiro modo, e restringir aqui a
  // FUNCIONARIO/ADMINISTRADOR. Não fazemos agora para não alterar o use-case
  // que acabámos de validar.
  const podeVerTodas = (u) =>
    ['FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO'].includes(u?.perfil);

  // ★ Fase 2A — ações que deixam de ser do funcionário e passam a ser exclusivas
  // do mecânico dono. O endpoint genérico /transicoes (staff) bloqueia-as como
  // defesa em profundidade: mesmo que alguém chame a API diretamente com um
  // token de funcionário, recebe 403 em vez de fazer o trabalho do mecânico.
    // ★ Fase 2A — ações que, depois de a OS estar atribuída a um mecânico,
  // passam a ser exclusivas do mecânico dono.
  //
  // Compatibilidade transitória:
  // - Se a OS ainda NÃO tem mecanico_id (fluxo antigo/smoke), o staff pode usar
  //   o endpoint genérico.
  // - Se a OS JÁ FOI atribuída a um mecânico, o staff é bloqueado.
  //
  // Isto preserva o novo modelo real:
  // funcionário cria/attribution → mecânico inicia diagnóstico/conclui reparação.
  // Mas não parte testes legados que não atribuem mecânico.
  const ACOES_RESERVADAS_MECANICO = new Set(['iniciar_diagnostico', 'concluir']);

  router.post('/ordens/:id/transicoes', ...staff, asyncRoute(async (req, res) => {
    const acao = req.body?.acao;

    if (ACOES_RESERVADAS_MECANICO.has(acao)) {
      const os = await osRepo.procurarPorId(req.params.id);

      if (os?.mecanicoId) {
        return res.status(403).json({
          erro: {
            codigo: 'ACAO_RESERVADA_MECANICO',
            mensagem: 'Esta OS já está atribuída a um mecânico. Esta ação pertence ao mecânico responsável.',
          },
        });
      }
    }

    const resultado = await transitarOs({
      id: req.params.id,
      utilizador: req.utilizador,
      acao,
      motivo: req.body?.motivo,
    });
    res.json({ data: resultado });
  }));
  // ------------------------------------------------------------
  // Use-cases EXISTENTES
  // ------------------------------------------------------------
  const criarOS = criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo });
  const listarOsStaff = criarListarOsStaff({ osRepo });
  const detalheOs = criarDetalheOs({ osRepo });
  const transitarOs = criarTransitarOs({ osRepo });
  const adicionarServico = criarAdicionarServico({ osRepo });
  const adicionarPeca = criarAdicionarPeca({ osRepo });
  const listarHistoricoOs = criarListarHistoricoOs({ osRepo });
  const listarMinhasOs = criarListarMinhasOs({ osRepo });
  const escolherEntrega = criarEscolherEntrega({ osRepo });

  // ------------------------------------------------------------
  // Use-cases NOVOS (F12)
  // ------------------------------------------------------------
  const atribuirMecanico = criarAtribuirMecanico({ osRepo, utilizadorRepo });
  const submeterDiagnostico = criarSubmeterDiagnostico({ osRepo });
  const precificarOS = criarPrecificarOS({ osRepo });
  const decisaoCliente = criarDecisaoCliente({ osRepo, clienteRepo });
  const validarRevisao = criarValidarRevisao({ osRepo });
  // ★ Fase 2A
  const iniciarDiagnostico = criarIniciarDiagnostico({ osRepo });
  const concluirReparacao = criarConcluirReparacao({ osRepo });

  // ============================================================
  // ⚠️ REGRA DE OURO DO EXPRESS:
  // Rotas ESTÁTICAS (/meu, /minhas, /mecanicos) SEMPRE ANTES
  // da rota DINÂMICA (/:id). Caso contrário, "/ordens/minhas"
  // é capturada por "/ordens/:id" e rebenta com
  // "invalid input syntax for type bigint: minhas".
  // ============================================================

  // --- Coleções (POST/GET em /ordens) ---
  router.post('/ordens', ...staff, asyncRoute(async (req, res) => {
    const resultado = await criarOS({ ...req.body, utilizador: req.utilizador });
    res.status(201).json({ data: resultado });
  }));

  router.get('/ordens', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarOsStaff(req.query ?? {}) });
  }));

  // --- ESTÁTICAS específicas (antes de /:id) ---

  // Cliente: as suas OS
  router.get('/ordens/meu', ...cliente, asyncRoute(async (req, res) => {
    res.json({ data: await listarMinhasOs({ utilizador: req.utilizador }) });
  }));

  // Mecânico: as OS atribuídas a ele
  router.get('/ordens/minhas', ...mecanico, asyncRoute(async (req, res) => {
    const lista = await osRepo.listarPorMecanico(req.utilizador.id);
    res.json({ data: lista });
  }));

  // Staff: lista de mecânicos ativos para o dropdown de atribuição
  router.get('/ordens/mecanicos', ...staff, asyncRoute(async (req, res) => {
    const lista = await utilizadorRepo.listarPorPerfil('MECANICO');
    res.json({ data: lista });
  }));

  // --- DINÂMICA genérica (:id) — SEMPRE depois das estáticas ---
  // ★ F12-CORREÇÃO (2/3) — passa isStaff (corrige o 403 do staff/mecânico).
  router.get('/ordens/:id', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({
      data: await detalheOs({
        id: req.params.id,
        utilizador: req.utilizador,
        isStaff: podeVerTodas(req.utilizador),
      }),
    });
  }));

  // --- Sub-rotas com :id ---

  // Linhas da OS { servicos, pecas }.
  // NOTA DE SEGURANÇA (F12): devolve preços. O mecânico não consome esta
  // rota no frontend (usa /ordens/minhas e /ordens/:id), logo o invariante
  // "mecânico nunca vê preços" está garantido pelo USO. Para blindar a nível
  // de API (defesa em profundidade), evoluir para um listarLinhasTecnico que
  // devolve preco_unitario: null e restringir a staff+cliente.
  router.get('/ordens/:id/linhas', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({ data: await osRepo.listarLinhas(req.params.id) });
  }));

  router.post('/ordens/:id/transicoes', ...staff, asyncRoute(async (req, res) => {
    const acao = req.body?.acao;

    // ★ Fase 2A — bloqueio de defesa em profundidade.
    if (ACOES_RESERVADAS_MECANICO.has(acao)) {
      return res.status(403).json({
        erro: {
          codigo: 'ACAO_RESERVADA_MECANICO',
          mensagem: 'Esta ação pertence ao mecânico responsável pela OS.',
        },
      });
    }

    const resultado = await transitarOs({
      id: req.params.id,
      utilizador: req.utilizador,
      acao,
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

  // ★ F12-CORREÇÃO (3/3) — passa utilizador + isStaff ao histórico.
  // Se o use-case só fizer ({ id }) => osRepo.listarHistorico(id), os args extra
  // são ignorados pelo destructuring (inofensivo). Se ele autorizar como o
  // detalhe-os.js (acessa utilizador.id), isto corrige o 500 por TypeError.
  // Win-win, risco-zero de regressão.
  router.get('/ordens/:id/historico', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({
      data: await listarHistoricoOs({
        id: req.params.id,
        utilizador: req.utilizador,
        isStaff: podeVerTodas(req.utilizador),
      }),
    });
  }));

  // F12: checklist técnico do diagnóstico.
  // Visível a staff + cliente (o mecânico já o tem no próprio form).
  router.get('/ordens/:id/checklist', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    res.json({ data: await osRepo.listarChecklist(req.params.id) });
  }));

  // RF07: escolha de modalidade de entrega — cliente OU staff
  router.post('/ordens/:id/entrega', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const resultado = await escolherEntrega({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      modalidade: req.body?.modalidade,
    });
    res.json({ data: resultado });
  }));

  // ============================================================
  // F12 — Fluxo Mecânico / Funcionário / Cliente
  // (todas usam :id, portanto ficam no bloco dinâmico)
  // ============================================================

  // Staff/Admin atribui OS ao mecânico
  router.patch('/ordens/:id/atribuir-mecanico', ...staff, asyncRoute(async (req, res) => {
    const { mecanicoId } = req.body ?? {};
    const resultado = await atribuirMecanico({
      ordemId: req.params.id,
      mecanicoId,
      utilizador: req.utilizador,
    });
    res.json({ data: resultado });
  }));

  // ★ Fase 2A — Mecânico inicia o diagnóstico (AGUARDANDO_DIAGNOSTICO → EM_DIAGNOSTICO)
  router.post('/ordens/:id/iniciar-diagnostico', ...mecanico, asyncRoute(async (req, res) => {
    const resultado = await iniciarDiagnostico({
      ordemId: req.params.id,
      utilizador: req.utilizador,
    });
    res.json({ data: resultado });
  }));

  // Mecânico submete diagnóstico (checklist + serviços/peças SEM preço)
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

  // ★ Fase 2A — Mecânico valida a conclusão técnica (EM_REPARACAO → CONCLUIDA)
  router.post('/ordens/:id/concluir-reparacao', ...mecanico, asyncRoute(async (req, res) => {
    const resultado = await concluirReparacao({
      ordemId: req.params.id,
      utilizador: req.utilizador,
    });
    res.json({ data: resultado });
  }));

  // Funcionário precifica (atribui preços + taxa diagnóstico)
  router.post('/ordens/:id/precificar', ...staff, asyncRoute(async (req, res) => {
    const resultado = await precificarOS({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      taxaDiagnostico: req.body?.taxaDiagnostico,
      precos: req.body?.precos,
    });
    res.json({ data: resultado });
  }));

  // Cliente toma decisão (aprovar / modificar / rejeitar)
  router.post('/ordens/:id/decisao', ...cliente, asyncRoute(async (req, res) => {
    const resultado = await decisaoCliente({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      acao: req.body?.acao,
      itensRemover: req.body?.itensRemover,
    });
    res.json({ data: resultado });
  }));

  // Funcionário valida cortes do cliente
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