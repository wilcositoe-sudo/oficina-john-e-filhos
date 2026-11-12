import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';

import {
  podeGerirCatalogo,
  erroPermissaoCatalogo,
} from '../../../shared/auth/catalogo-permissoes.js';

const stripPreco = (s) => ({
  id: s.id,
  codigo: s.codigo,
  nome: s.nome,
  descricao: s.descricao,
  ativo: s.ativo,
});

export function createCatalogRouter({
  requireAuth,
  requireRole,
  criar,
  listarPublico,
  listarTodos,
  desativar,
  atualizar,
  apagar,
}) {
  const router = Router();
  const staff = [requireAuth, requireRole('FUNCIONARIO', 'ADMINISTRADOR')];

  const podeVerCatalogo = [
    requireAuth,
    requireRole('MECANICO', 'FUNCIONARIO', 'ADMINISTRADOR'),
  ];

  // Público: catálogo activo, pode mostrar preço ao cliente.
  router.get('/servicos', asyncRoute(async (req, res) => {
    res.json({ data: await listarPublico() });
  }));

  // Interno: mecânico vê sem preço; funcionário/admin vê gestão completa.
  router.get('/servicos/todos', ...podeVerCatalogo, asyncRoute(async (req, res) => {
    const todos = await listarTodos();

    if (req.utilizador.perfil === 'MECANICO') {
      return res.json({
        data: todos
          .filter((s) => s.ativo === true)
          .map(stripPreco),
      });
    }

    res.json({ data: todos });
  }));

  // Gestão: só admin ou funcionário autorizado.
  router.post('/servicos', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    const resultado = await criar(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  router.patch('/servicos/:id', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    res.json({ data: await atualizar({ ...(req.body ?? {}), id: req.params.id }) });
  }));

  router.delete('/servicos/:id', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    await apagar(req.params.id);
    res.status(204).send();
  }));

  // Desativar: só admin ou funcionário autorizado.
  router.patch('/servicos/:id/desativar', ...staff, asyncRoute(async (req, res) => {
    if (!podeGerirCatalogo(req.utilizador)) {
      return res.status(403).json({ erro: erroPermissaoCatalogo() });
    }

    const resultado = await desativar(req.params.id);
    res.json({ data: resultado });
  }));

  return router;
}