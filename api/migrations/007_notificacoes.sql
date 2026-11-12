-- F12/P1: notificações in-app (polling MVP; WebSocket na evolução)
CREATE TABLE IF NOT EXISTS notificacoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  destinatario_perfil TEXT NOT NULL
    CHECK (destinatario_perfil IN ('CLIENTE','FUNCIONARIO','MECANICO','ADMINISTRADOR')),
  destinatario_id BIGINT REFERENCES utilizadores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  corpo TEXT,
  ordem_id BIGINT REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'OS',
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leitura do utilizador concreto (cliente/mecânico)
CREATE INDEX IF NOT EXISTS ix_notif_destinatario
  ON notificacoes(destinatario_id, lida, criado_at DESC);

-- Broadcast por perfil (staff), só linhas sem destinatário concreto
CREATE INDEX IF NOT EXISTS ix_notif_perfil
  ON notificacoes(destinatario_perfil, lida, criado_at DESC)
  WHERE destinatario_id IS NULL;