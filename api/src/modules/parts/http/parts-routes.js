import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { podeGerirCatalogo, erroPermissaoCatalogo } from '../../../shared/auth/catalogo-permissoes.js';

export function createPartsRouter({ requireAuth, requireRole, criar, listar, atualizar, apagar }) {
  const router = Router();

  // Staff completo: funcionário/administrador
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];

  // Quem pode ver catálogo: mecânico + funcionário + administrador
  const podeVerCatalogo = [
    requireAuth,
    requireRole('MECANICO', 'FUNCIONARIO', 'ADMINISTRADOR'),
  ];

  // GET /pecas
  // - Mecânico vê apenas nome/descrição/ativo, sem preço.
  // - Funcionário/Admin vê preço para gestão/precificação.
  router.get('/pecas', ...podeVerCatalogo, asyncRoute(async (req, res) => {
    const pecas = await listar();

    if (req.utilizador.perfil === 'MECANICO') {
      return res.json({
        data: pecas.map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nome: p.nome,
          descricao: p.descricao,
          ativo: p.ativo,
        })),
      });
    }

    res.json({ data: pecas });
  }));

  // POST /pecas
  // Só admin ou funcionário autorizado pode criar peça.
  router.post('/pecas', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    const resultado = await criar(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  router.patch('/pecas/:id', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    res.json({ data: await atualizar({ ...(req.body ?? {}), id: req.params.id }) });
  }));

  router.delete('/pecas/:id', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    await apagar(req.params.id);
    res.status(204).send();
  }));

  return router;
}