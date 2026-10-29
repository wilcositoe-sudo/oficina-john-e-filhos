CREATE TABLE sessoes (
  token TEXT PRIMARY KEY,
  utilizador_id BIGINT NOT NULL REFERENCES utilizadores(id),
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_at TIMESTAMPTZ NOT NULL,
  revogada BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ix_sessoes_utilizador ON sessoes(utilizador_id);