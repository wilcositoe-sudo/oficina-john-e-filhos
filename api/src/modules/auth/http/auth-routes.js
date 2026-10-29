import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgUtilizadorRepository } from '../adapters/pg-utilizador-repository.js';
import { criarPgClienteRepository } from '../adapters/pg-cliente-repository.js';
import { criarPgSessaoRepository } from '../adapters/pg-sessao-repository.js';
import { criarRegistarCliente } from '../use-cases/registar-cliente.js';
import { criarLogin } from '../use-cases/login.js';
import { createRequireAuth } from './session-middleware.js';

function extrairToken(req) {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

export function createAuthRouter() {
  const router = Router();
  const utilizadorRepo = criarPgUtilizadorRepository();
  const clienteRepo = criarPgClienteRepository();
  const sessaoRepo = criarPgSessaoRepository();
  const requireAuth = createRequireAuth({ sessaoRepo, utilizadorRepo });

  const registarCliente = criarRegistarCliente({ utilizadorRepo, clienteRepo });
  const login = criarLogin({ utilizadorRepo, sessaoRepo });

  router.post('/register', asyncRoute(async (req, res) => {
    const resultado = await registarCliente(req.body ?? {});
    res.status(201).json({ data: resultado });
  }));

  router.post('/login', asyncRoute(async (req, res) => {
    const resultado = await login(req.body ?? {});
    res.json({ data: resultado });
  }));

  router.post('/logout', requireAuth, asyncRoute(async (req, res) => {
    await sessaoRepo.revogar(extrairToken(req));
    res.status(204).send();
  }));

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: req.utilizador });
  });

  return router;
}