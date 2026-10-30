import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgPecaRepository } from '../adapters/pg-peca-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth, createRequireRole } from '../../auth/http/session-middleware.js';
import { criarCriarPeca } from '../use-cases/criar-peca.js';
import { criarListarPecas } from '../use-cases/listar-pecas.js';

export function createPartsRouter() {
  const router = Router();
  const pecaRepo = criarPgPecaRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });
  const staff = [requireAuth, createRequireRole('FUNCIONARIO', 'ADMINISTRADOR')];

  const criar = criarCriarPeca({ pecaRepo });
  const listar = criarListarPecas({ pecaRepo });

  router.get('/pecas', ...staff, asyncRoute(async (req, res) => {
    res.json({ data: await listar() });
  }));

  router.post('/pecas', ...staff, asyncRoute(async (req, res) => {
    const resultado = await criar(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  return router;
}