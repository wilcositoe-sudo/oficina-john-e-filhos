import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
export function createWorkOrdersRouter(dependencies) {
  const router = Router();
  const {
    requireAuth,
    requireRole,
    criarOS,
    listarOsStaff,
    detalheOs,
    transitarOsStaff,
    adicionarServico,
    adicionarPeca,
    listarHistoricoOs,
    listarMinhasOs,
    listarOsMecanico,
    listarLinhasOs,
    listarChecklistOs,
    listarMecanicos,
    escolherEntrega,
    atribuirMecanico,
    submeterDiagnostico,
    precificarOS,
    decisaoCliente,
    validarRevisao,
    iniciarDiagnostico,
    concluirReparacao,
    iniciarReparacao,
    registarNovaNecessidade,
  } = dependencies;
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];
  const mecanico = [requireAuth, requireRole('MECANICO')];
  const cliente = [requireAuth, requireRole('CLIENTE')];
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
    res.json({ data: await listarMinhasOs({ utilizadorId: req.utilizador.id }) });
  }));

  // Mecânico: as OS atribuídas a ele
  router.get('/ordens/minhas', ...mecanico, asyncRoute(async (req, res) => {
    res.json({ data: await listarOsMecanico({ utilizadorId: req.utilizador.id }) });
  }));

  // Staff: lista de mecânicos ativos para o dropdown de atribuição
  router.get('/ordens/mecanicos', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listarMecanicos() });
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
    res.json({ data: await listarLinhasOs({ ordemId: req.params.id }) });
  }));

  router.post('/ordens/:id/transicoes', ...staff, asyncRoute(async (req, res) => {
    const acao = req.body?.acao;
    try {
      const resultado = await transitarOsStaff({
        id: req.params.id,
        utilizador: req.utilizador,
        acao,
        motivo: req.body?.motivo,
      });
      res.json({ data: resultado });
    } catch (error) {
      if (error.code !== 'ACAO_RESERVADA_MECANICO') throw error;
      return res.status(403).json({
        erro: {
          codigo: 'ACAO_RESERVADA_MECANICO',
          mensagem: error.message,
        },
      });
    }
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
  // O caso de uso valida a autorização para o dono ou para staff.
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
    res.json({ data: await listarChecklistOs({ ordemId: req.params.id }) });
  }));

  // RF07: escolha de modalidade de entrega — cliente OU staff
  router.post('/ordens/:id/entrega', ...qualquerAutenticado, asyncRoute(async (req, res) => {
    const resultado = await escolherEntrega({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      modalidade: req.body?.modalidade,
      enderecoEntrega: req.body?.enderecoEntrega,
      lat: req.body?.lat,
      lng: req.body?.lng,
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

    // Fase 5: mecânico inicia reparação
  router.post('/ordens/:id/iniciar-reparacao', ...mecanico, asyncRoute(async (req, res) => {
    const resultado = await iniciarReparacao({
      ordemId: req.params.id,
      utilizador: req.utilizador,
    });

    res.json({ data: resultado });
  }));

  // Fase 5: mecânico regista necessidade extra durante reparação
  router.post('/ordens/:id/nova-necessidade', ...mecanico, asyncRoute(async (req, res) => {
    const resultado = await registarNovaNecessidade({
      ordemId: req.params.id,
      utilizador: req.utilizador,
      servicos: req.body?.servicos ?? [],
      pecas: req.body?.pecas ?? [],
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