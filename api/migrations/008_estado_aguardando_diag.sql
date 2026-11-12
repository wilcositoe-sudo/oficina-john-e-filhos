-- F12 Fase 2A: garante que AGUARDANDO_DIAGNOSTICO existe no CHECK de ordens_servico.estado.
-- Abordagem dinâmica: remove check constraints antigas da coluna estado e recria uma única constraint.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_attribute att
      ON att.attrelid = cls.oid
     AND att.attnum = ANY(con.conkey)
    WHERE cls.relname = 'ordens_servico'
      AND att.attname = 'estado'
      AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.ordens_servico DROP CONSTRAINT %I', rec.conname);
  END LOOP;

  ALTER TABLE public.ordens_servico
    ADD CONSTRAINT ordens_servico_estado_check
    CHECK (
      estado IN (
        'PENDENTE',
        'AGUARDANDO_DIAGNOSTICO',
        'EM_DIAGNOSTICO',
        'AGUARDANDO_PRECO_FUNCIONARIO',
        'AGUARDANDO_APROVACAO_CLIENTE',
        'AGUARDANDO_VALIDACAO_FUNCIONARIO',
        'AGUARDANDO_APROVACAO_ORCAMENTO',
        'EM_REPARACAO',
        'AGUARDANDO_PECAS',
        'CONCLUIDA',
        'PAGA',
        'ENTREGUE',
        'REJEITADA',
        'CANCELADA'
      )
    );
END $$;