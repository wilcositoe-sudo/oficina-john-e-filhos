ALTER TABLE mensagens
  ALTER COLUMN remetente_id DROP NOT NULL;

ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'UTILIZADOR'
    CHECK (tipo IN ('UTILIZADOR', 'SISTEMA'));

ALTER TABLE mensagens
  ADD CONSTRAINT mensagens_tipo_remetente_check
  CHECK (
    (tipo = 'UTILIZADOR' AND remetente_id IS NOT NULL)
    OR (tipo = 'SISTEMA' AND remetente_id IS NULL)
  );

CREATE TABLE chat_conversa_ocultacoes (
  conversa_id BIGINT NOT NULL REFERENCES chat_conversas(id) ON DELETE CASCADE,
  utilizador_id BIGINT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  ocultado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversa_id, utilizador_id)
);

CREATE TABLE mensagens_os_leituras (
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  utilizador_id BIGINT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  ultima_mensagem_id BIGINT NOT NULL DEFAULT 0,
  atualizado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ordem_id, utilizador_id)
);

CREATE TABLE mensagens_os_ocultacoes (
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  utilizador_id BIGINT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  ocultado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ordem_id, utilizador_id)
);

CREATE INDEX ix_chat_conversa_ocultacoes_utilizador
  ON chat_conversa_ocultacoes(utilizador_id, ocultado_at DESC);

CREATE INDEX ix_mensagens_os_leituras_utilizador
  ON mensagens_os_leituras(utilizador_id, atualizado_at DESC);

CREATE INDEX ix_mensagens_os_ocultacoes_utilizador
  ON mensagens_os_ocultacoes(utilizador_id, ocultado_at DESC);
