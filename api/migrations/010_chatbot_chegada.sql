-- Fase 3B: chegada do veículo à oficina no chatbot/lead
-- Versão segura: só executa se a tabela chat_conversas existir.
-- Com a 009 fusão, este bloco torna-se no-op (as colunas já existem).

DO $$
BEGIN
  IF to_regclass('public.chat_conversas') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_modalidade TEXT;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_bairro TEXT;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_quarteirao TEXT;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_numero_casa TEXT;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_ponto_referencia TEXT;

  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_lat DOUBLE PRECISION;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_lng DOUBLE PRECISION;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_precisao_m NUMERIC(10,2);

  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_distancia_km NUMERIC(10,2);
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_tempo_min INTEGER;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_taxa NUMERIC(12,2) NOT NULL DEFAULT 0;
  ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS chegada_consentimento_at TIMESTAMPTZ;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_conversas_chegada_modalidade_check'
  ) THEN
    ALTER TABLE public.chat_conversas
      ADD CONSTRAINT chat_conversas_chegada_modalidade_check
      CHECK (
        chegada_modalidade IS NULL
        OR chegada_modalidade IN ('LEVAR_OFICINA', 'RECOLHA_DOMICILIO')
      );
  END IF;
END $$;