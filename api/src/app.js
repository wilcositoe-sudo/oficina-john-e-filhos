import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config } from './config.js';
import { createAppDependencies } from './composition-root.js';
import { logger } from './shared/logging/logger.js';

export function createApp() {
  const app = express();
  const {
    notificationsRouter,
    chatbotRouter,
    authRouter,
    catalogRouter,
    vehicleRouter,
    quotesRouter,
    appointmentsRouter,
    workOrdersRouter,
    partsRouter,
    messagingRouter,
    paymentsRouter,
    ratingsRouter,
    adminRouter,
    evidenciasRouter,
  } = createAppDependencies();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use(cors({ origin: config.webOrigin }));

  const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_ROOT || 'uploads');
  app.use('/uploads', express.static(UPLOAD_ROOT));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  app.use('/api/v1', notificationsRouter);
  app.use('/api/v1', chatbotRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1', catalogRouter);
  app.use('/api/v1', vehicleRouter);
  app.use('/api/v1', quotesRouter);
  app.use('/api/v1', appointmentsRouter);
  app.use('/api/v1', workOrdersRouter);
  app.use('/api/v1', partsRouter);
  app.use('/api/v1', messagingRouter);
  app.use('/api/v1', paymentsRouter);
  app.use('/api/v1', ratingsRouter);
  app.use('/api/v1', adminRouter);
  app.use('/api/v1', evidenciasRouter);
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