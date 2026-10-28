import express from 'express';
import { logger } from './shared/logging/logger.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Health check — usado para verificar se a API está no ar
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // 404 para rotas não existentes
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
  });

  // Middleware de erro central — nunca expõe stack trace ao cliente (Doc 05 §5.9)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error({ message: err.message }, 'erro não tratado');
    const status = Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error: {
        code: err.code ?? 'INTERNAL_ERROR',
        message: status === 500 ? 'Erro interno do servidor.' : err.message,
      },
    });
  });

  return app;
}