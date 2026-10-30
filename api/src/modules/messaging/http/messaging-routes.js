import { Router } from 'express';
import { asyncRoute } from '../../../shared/http/async-route.js';
import { criarPgMensagemRepository } from '../adapters/pg-mensagem-repository.js';
import { criarPgOsRepository } from '../../work-orders/adapters/pg-os-repository.js';
import { criarPgSessaoRepository } from '../../auth/adapters/pg-sessao-repository.js';
import { criarPgUtilizadorRepository } from '../../auth/adapters/pg-utilizador-repository.js';
import { createRequireAuth } from '../../auth/http/session-middleware.js';
import { criarEnviarMensagem } from '../use-cases/enviar-mensagem.js';
import { criarListarMensagens } from '../use-cases/listar-mensagens.js';

export function createMessagingRouter() {
  const router = Router();
  const mensagemRepo = criarPgMensagemRepository();
  const osRepo = criarPgOsRepository();
  const requireAuth = createRequireAuth({
    sessaoRepo: criarPgSessaoRepository(),
    utilizadorRepo: criarPgUtilizadorRepository(),
  });

  const enviar = criarEnviarMensagem({ mensagemRepo, osRepo });
  const listar = criarListarMensagens({ mensagemRepo, osRepo });

  router.get('/ordens/:id/mensagens', requireAuth, asyncRoute(async (req, res) => {
    res.json({ data: await listar({ ordemId: req.params.id, utilizador: req.utilizador }) });
  }));

  router.post('/ordens/:id/mensagens', requireAuth, asyncRoute(async (req, res) => {
    const resultado = await enviar({ ordemId: req.params.id, remetente: req.utilizador, ...(req.body ?? {}) });
    res.status(201).json({ data: resultado });
  }));

  return router;
}