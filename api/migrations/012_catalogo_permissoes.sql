-- Fase 4A: permissão para funcionários gerirem catálogo de serviços/peças
ALTER TABLE utilizadores
  ADD COLUMN IF NOT EXISTS pode_gerir_catalogo BOOLEAN NOT NULL DEFAULT FALSE;

-- Administradores podem sempre gerir catálogo
UPDATE utilizadores
SET pode_gerir_catalogo = TRUE
WHERE perfil = 'ADMINISTRADOR';

CREATE INDEX IF NOT EXISTS ix_utilizadores_pode_gerir_catalogo
  ON utilizadores(pode_gerir_catalogo)
  WHERE pode_gerir_catalogo = TRUE;