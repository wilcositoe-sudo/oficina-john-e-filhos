-- Atribuição da OS a um mecânico específico
ALTER TABLE ordens_servico
ADD COLUMN IF NOT EXISTS mecanico_id BIGINT REFERENCES utilizadores(id);

-- Índice para o mecânico listar rapidamente as suas OS
CREATE INDEX IF NOT EXISTS ix_os_mecanico_estado
  ON ordens_servico(mecanico_id, estado);

-- Tabela de checklist técnico do diagnóstico
CREATE TABLE IF NOT EXISTS diagnostico_checklist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  mecanico_id BIGINT NOT NULL REFERENCES utilizadores(id),
  item TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('OK','DESGASTE','AVARIADO','SUBSTITUIR')),
  observacao TEXT,
  valor_medicao TEXT,
  foto_url TEXT,
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_diag_checklist_ordem
  ON diagnostico_checklist(ordem_id);

-- Tabela de anexos (fotos/vídeos) da OS
CREATE TABLE IF NOT EXISTS os_anexos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('FOTO','VIDEO','DOCUMENTO')),
  url TEXT NOT NULL,
  legenda TEXT,
  enviado_por BIGINT NOT NULL REFERENCES utilizadores(id),
  fase TEXT NOT NULL CHECK (fase IN ('CHECKIN','DIAGNOSTICO','REPARACAO','ENTREGA')),
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Linhas de serviço/peça na OS agora têm flag "precificado"
ALTER TABLE servicos_os
ADD COLUMN IF NOT EXISTS precificado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE pecas_os
ADD COLUMN IF NOT EXISTS precificado BOOLEAN NOT NULL DEFAULT FALSE;