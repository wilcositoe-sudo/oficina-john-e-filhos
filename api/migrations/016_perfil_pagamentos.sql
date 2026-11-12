ALTER TABLE utilizadores
  ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT;

ALTER TABLE pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_metodo_check;

ALTER TABLE pagamentos
  ADD CONSTRAINT pagamentos_metodo_check
  CHECK (metodo IN (
    'PRESENCIAL',
    'CARTAO',
    'MOBILE_MONEY',
    'OUTRO',
    'MPESA',
    'EMOLA',
    'MKESH',
    'CONTA_BANCARIA'
  ));
