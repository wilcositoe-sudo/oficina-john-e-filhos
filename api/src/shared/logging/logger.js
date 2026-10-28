// Logger estruturado mínimo (JSON lines) — nunca logar senhas, tokens ou dados de cartão.
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const current = LEVELS[(process.env.LOG_LEVEL ?? 'info').toLowerCase()] ?? LEVELS.info;

function write(level, msg, meta) {
  if (LEVELS[level] < current) return;
  const line = { level, msg, time: new Date().toISOString(), ...(meta ?? {}) };
  const out = JSON.stringify(line);
  if (level === 'error') process.stderr.write(out + '\n');
  else process.stdout.write(out + '\n');
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};