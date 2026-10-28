// Configuração central — valores de desenvolvimento como fallback.
// Segredos NUNCA entram aqui hardcoded (Doc 16 §16.2): usam .env local.
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`PORT inválido: "${process.env.PORT}"`);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL em falta ou inválida (esperado postgresql://...)');
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  databaseUrl,
};