-- Fase 4: catálogo com permissões + itens personalizados no diagnóstico + evidências
-- Tudo aditivo. Não altera estados da OS nem o fluxo F7/F10.

-- ===== 4A: permissão para gerir catálogo =====
ALTER TABLE utilizadores
  ADD COLUMN IF NOT EXISTS pode_gerir_catalogo BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE utilizadores
SET pode_gerir_catalogo = TRUE
WHERE perfil = 'ADMINISTRADOR';

CREATE INDEX IF NOT EXISTS ix_utilizadores_pode_gerir_catalogo
  ON utilizadores(pode_gerir_catalogo)
  WHERE pode_gerir_catalogo = TRUE;

-- ===== 4B: permitir itens personalizados =====
-- As FKs eram NOT NULL; tornamos nullable para itens custom.
-- (FK só se aplica quando o valor não é NULL, por isso é seguro.)
ALTER TABLE servicos_os ALTER COLUMN servico_id DROP NOT NULL;
ALTER TABLE pecas_os    ALTER COLUMN peca_id    DROP NOT NULL;

-- Origem do item: CATALOGO (id preenchido) ou CUSTOM (id NULL, nome no snapshot)
ALTER TABLE servicos_os ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'CATALOGO'
  CHECK (origem IN ('CATALOGO','CUSTOM'));
ALTER TABLE pecas_os    ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'CATALOGO'
  CHECK (origem IN ('CATALOGO','CUSTOM'));

-- pecas_os não tinha descricao_snapshot; adicionamos para guardar o nome custom.
ALTER TABLE pecas_os ADD COLUMN IF NOT EXISTS descricao_snapshot TEXT;

-- ===== 4C: evidências (foto/vídeo) anexáveis =====
CREATE TABLE IF NOT EXISTS os_evidencias (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('CHECKLIST','SERVICO','PECA','GERAL')),
  referencia_id BIGINT,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  tamanho_bytes BIGINT NOT NULL DEFAULT 0,
  legenda TEXT,
  mecanico_id BIGINT REFERENCES utilizadores(id) ON DELETE SET NULL,
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_os_evidencias_ordem
  ON os_evidencias(ordem_id, criado_at DESC);