ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
  ADD COLUMN IF NOT EXISTS entrega_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS entrega_lng DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ordens_servico_entrega_coordenadas_check'
  ) THEN
    ALTER TABLE ordens_servico
      ADD CONSTRAINT ordens_servico_entrega_coordenadas_check
      CHECK (
        (entrega_lat IS NULL AND entrega_lng IS NULL)
        OR (
          entrega_lat BETWEEN -90 AND 90
          AND entrega_lng BETWEEN -180 AND 180
        )
      );
  END IF;
END $$;
