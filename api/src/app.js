import express from 'express';
import { createAuthRouter } from './modules/auth/http/auth-routes.js';
import { logger } from './shared/logging/logger.js';
import { createCatalogRouter } from './modules/catalog/http/catalog-routes.js';
import { createVehicleRouter } from './modules/vehicles/http/vehicle-routes.js';
import cors from 'cors';
import { config } from './config.js';


export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cors({ origin: config.webOrigin }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // API versionada (Doc 10 §10.1)
  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1', createCatalogRouter());
  app.use('/api/v1', createVehicleRouter());
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
  });

  // Middleware de erro central — mapeia DomainError; 500 nunca expõe detalhes (Doc 05 §5.9)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status === 500) logger.error({ message: err.message }, 'erro não tratado');
    res.status(status).json({
      error: {
        code: err.code ?? 'INTERNAL_ERROR',
        message: status === 500 ? 'Erro interno do servidor.' : err.message,
        ...(err.details && status !== 500 ? { details: err.details } : {}),
      },
    });
  });

  return app;
}