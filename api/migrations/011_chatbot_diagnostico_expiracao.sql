-- Fase 3C: decisão de diagnóstico e retenção de 24h para conversas sem OS
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS quer_diagnostico BOOLEAN;
ALTER TABLE chat_conversas ADD COLUMN IF NOT EXISTS expira_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ix_chat_conversas_expira_em
  ON chat_conversas(expira_em)
  WHERE expira_em IS NOT NULL;