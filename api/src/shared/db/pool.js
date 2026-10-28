import pg from 'pg';
import { config } from '../../config.js';
import { logger } from '../logging/logger.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 5,
  // O Supabase exige SSL; rejectUnauthorized:false é aceitável em dev.
  // TODO produção: usar CA válida do fornecedor.
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  logger.error({ message: err.message }, 'erro inesperado no pool PostgreSQL');
});