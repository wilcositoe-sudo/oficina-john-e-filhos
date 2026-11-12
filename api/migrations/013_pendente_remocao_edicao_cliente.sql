-- Fase 5: edição do cliente fica pendente até validação do funcionário
ALTER TABLE servicos_os
  ADD COLUMN IF NOT EXISTS pendente_remocao BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pecas_os
  ADD COLUMN IF NOT EXISTS pendente_remocao BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS ix_servicos_os_pendente_remocao
  ON servicos_os(ordem_id)
  WHERE pendente_remocao = TRUE;

CREATE INDEX IF NOT EXISTS ix_pecas_os_pendente_remocao
  ON pecas_os(ordem_id)
  WHERE pendente_remocao = TRUE;