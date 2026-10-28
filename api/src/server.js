import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './shared/logging/logger.js';

const app = createApp();

app.listen(config.port, () => {
  logger.info(`API no ar em http://localhost:${config.port} (${config.nodeEnv})`);
});