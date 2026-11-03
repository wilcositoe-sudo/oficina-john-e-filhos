import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createAuthRouter } from './modules/auth/http/auth-routes.js';
import { createCatalogRouter } from './modules/catalog/http/catalog-routes.js';
import { createVehicleRouter } from './modules/vehicles/http/vehicle-routes.js';
import { createQuotesRouter } from './modules/quotes/http/quotes-routes.js';
import { createAppointmentsRouter } from './modules/appointments/http/appointments-routes.js';
import { createWorkOrdersRouter } from './modules/work-orders/http/work-orders-routes.js';
import { createPartsRouter } from './modules/parts/http/parts-routes.js';
import { createMessagingRouter } from './modules/messaging/http/messaging-routes.js';
import { createPaymentsRouter } from './modules/payments/http/payments-routes.js';
import { createRatingsRouter } from './modules/ratings/http/ratings-routes.js';
import { createAdminRouter } from './modules/admin/http/admin-routes.js';
import { logger } from './shared/logging/logger.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cors({ origin: config.webOrigin }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1', createCatalogRouter());
  app.use('/api/v1', createVehicleRouter());
  app.use('/api/v1', createQuotesRouter());
  app.use('/api/v1', createAppointmentsRouter());
  app.use('/api/v1', createWorkOrdersRouter());
  app.use('/api/v1', createPartsRouter());
  app.use('/api/v1', createMessagingRouter());
  app.use('/api/v1', createPaymentsRouter());
  app.use('/api/v1', createRatingsRouter());
  app.use('/api/v1', createAdminRouter());

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' },
    });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) ? err.status : 500;
    if (status === 500) logger.error('erro não tratado', { erro: err.message });
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