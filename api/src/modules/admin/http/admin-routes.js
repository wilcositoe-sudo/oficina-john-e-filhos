import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

export function createAdminRouter({
  requireAuth,
  requireRole,
  criarConta,
  listarContas,
  atualizarConta,
  apagarConta,
  definirPermissaoCatalogo,
  dashboard,
  moderarAvaliacoes,
}) {
  const router = Router();
  const admin = [requireAuth, requireRole('ADMINISTRADOR')];

  // --- Contas Internas ---
  router.get('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await listarContas({ utilizador: req.utilizador }),
    });
  }));

  router.post('/admin/utilizadores', ...admin, asyncRoute(async (req, res) => {
    const resultado = await criarConta({
      ...(req.body ?? {}),
      utilizador: req.utilizador,
    });
    res.status(201).json({ data: resultado });
  }));

  router.patch('/admin/utilizadores/:id', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await atualizarConta({
        ...(req.body ?? {}),
        id: req.params.id,
        utilizador: req.utilizador,
      }),
    });
  }));

  router.delete('/admin/utilizadores/:id', ...admin, asyncRoute(async (req, res) => {
    await apagarConta({
      id: req.params.id,
      utilizador: req.utilizador,
    });
    res.status(204).send();
  }));

  // --- ★ Fase 4A: permissão de catálogo ---
  router.patch(
    '/admin/utilizadores/:id/permissao-catalogo',
    ...admin,
    asyncRoute(async (req, res) => {
      try {
        res.json({
          data: await definirPermissaoCatalogo({
            id: req.params.id,
            pode: req.body?.podeGerirCatalogo,
            utilizador: req.utilizador,
          }),
        });
      } catch (error) {
        const statusByCode = {
          VALIDACAO: 422,
          NAO_PODE_REVOGAR_PROPRIA_PERMISSAO: 400,
          UTILIZADOR_NAO_ENCONTRADO: 404,
        };
        if (!statusByCode[error.code]) throw error;
        return res.status(statusByCode[error.code]).json({
          erro: {
            codigo: error.code,
            mensagem: error.message,
          },
        });
      }
    }),
  );

  // --- Dashboard ---
  router.get('/admin/dashboard', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await dashboard({
        inicio: req.query.inicio,
        fim: req.query.fim,
        utilizador: req.utilizador,
      }),
    });
  }));

  // --- Moderação de Avaliações (F12) ---
  router.get('/admin/avaliacoes', ...admin, asyncRoute(async (req, res) => {
    res.json({ data: await moderarAvaliacoes.listar() });
  }));

  router.patch('/admin/avaliacoes/:id', ...admin, asyncRoute(async (req, res) => {
    res.json({
      data: await moderarAvaliacoes.atualizarPublicacao({
        id: req.params.id,
        publicada: req.body?.publicada,
      }),
    });
  }));

  return router;
}