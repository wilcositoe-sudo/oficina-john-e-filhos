DO $$
DECLARE v_type text; v_enum text; r record;
BEGIN
  SELECT data_type, udt_name INTO v_type, v_enum
  FROM information_schema.columns
  WHERE table_name='ordens_servico' AND column_name='estado';

  IF v_type = 'USER-DEFINED' THEN
    BEGIN EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', v_enum, 'AGUARDANDO_ATRIBUICAO_REPARACAO'); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'enum 1: %', SQLERRM; END;
    BEGIN EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', v_enum, 'AGUARDANDO_REPARACAO');          EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'enum 2: %', SQLERRM; END;
    BEGIN EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS %L', v_enum, 'AGUARDANDO_VALIDACAO_FUNCIONARIO'); EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'enum 3: %', SQLERRM; END;
  ELSE
    FOR r IN SELECT conname FROM pg_constraint
             WHERE conrelid='ordens_servico'::regclass AND contype='c'
               AND pg_get_constraintdef(oid) ILIKE '%estado%'
    LOOP EXECUTE format('ALTER TABLE ordens_servico DROP CONSTRAINT %I', r.conname); END LOOP;
    ALTER TABLE ordens_servico ADD CONSTRAINT ordens_servico_estado_check CHECK (
      estado IN ('PENDENTE','AGUARDANDO_DIAGNOSTICO','EM_DIAGNOSTICO','AGUARDANDO_PRECO_FUNCIONARIO',
                 'AGUARDANDO_APROVACAO_CLIENTE','AGUARDANDO_VALIDACAO_FUNCIONARIO',
                 'AGUARDANDO_ATRIBUICAO_REPARACAO','AGUARDANDO_REPARACAO','EM_REPARACAO','AGUARDANDO_PECAS',
                 'CONCLUIDA','PAGA','ENTREGUE','REJEITADA','CANCELADA','AGUARDANDO_APROVACAO_ORCAMENTO'));
  END IF;
END $$;