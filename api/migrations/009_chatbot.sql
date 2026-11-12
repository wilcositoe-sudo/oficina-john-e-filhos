-- Fase 3: chatbot pré-orçamento, escalonamento humano, agendamento e chegada à oficina
-- Versão fusão: já inclui as colunas chegada_* (antes divididas com a 010).

CREATE TABLE IF NOT EXISTS chat_conversas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilizador_id BIGINT NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
  cliente_id BIGINT REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id BIGINT REFERENCES veiculos(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'BOT'
    CHECK (status IN ('BOT','EM_ATENDIMENTO','AGUARDANDO_FUNCIONARIO','FECHADA','CONVERTIDA')),

  etapa TEXT NOT NULL DEFAULT 'INICIO',

  nome_cliente TEXT,
  email TEXT,
  telefone TEXT,
  problema TEXT,
  orcamento_estimado NUMERIC(12,2),

  agendado_at TIMESTAMPTZ,

  modalidade_entrega TEXT
    CHECK (modalidade_entrega IN ('LEVANTAMENTO','DOMICILIO')),
  taxa_entrega NUMERIC(12,2) NOT NULL DEFAULT 0,

  chegada_modalidade TEXT
    CHECK (chegada_modalidade IS NULL OR chegada_modalidade IN ('LEVAR_OFICINA','RECOLHA_DOMICILIO')),
  chegada_bairro TEXT,
  chegada_quarteirao TEXT,
  chegada_numero_casa TEXT,
  chegada_ponto_referencia TEXT,

  chegada_lat DOUBLE PRECISION,
  chegada_lng DOUBLE PRECISION,
  chegada_precisao_m NUMERIC(10,2),

  chegada_distancia_km NUMERIC(10,2),
  chegada_tempo_min INTEGER,
  chegada_taxa NUMERIC(12,2) NOT NULL DEFAULT 0,
  chegada_consentimento_at TIMESTAMPTZ,

  atendido_por BIGINT REFERENCES utilizadores(id) ON DELETE SET NULL,
  os_id BIGINT REFERENCES ordens_servico(id) ON DELETE SET NULL,

  nao_lidas_staff INTEGER NOT NULL DEFAULT 0,
  nao_lidas_cliente INTEGER NOT NULL DEFAULT 0,

  ultima_mensagem_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_chat_conversas_utilizador
  ON chat_conversas(utilizador_id, atualizado_at DESC);

CREATE INDEX IF NOT EXISTS ix_chat_conversas_staff
  ON chat_conversas(status, nao_lidas_staff DESC, ultima_mensagem_at DESC);

CREATE TABLE IF NOT EXISTS chat_mensagens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversa_id BIGINT NOT NULL REFERENCES chat_conversas(id) ON DELETE CASCADE,
  remetente TEXT NOT NULL CHECK (remetente IN ('CLIENTE','BOT','STAFF')),
  remetente_id BIGINT REFERENCES utilizadores(id) ON DELETE SET NULL,
  conteudo TEXT NOT NULL,
  metadata JSONB,
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_chat_mensagens_conversa
  ON chat_mensagens(conversa_id, id ASC);

CREATE TABLE IF NOT EXISTS chat_reservas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversa_id BIGINT NOT NULL REFERENCES chat_conversas(id) ON DELETE CASCADE,
  inicio_at TIMESTAMPTZ NOT NULL,
  fim_at TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL DEFAULT 'RESERVADO'
    CHECK (estado IN ('RESERVADO','CONFIRMADO','CANCELADO')),
  criado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim_at > inicio_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chat_reservas_horario_activo
  ON chat_reservas(inicio_at)
  WHERE estado <> 'CANCELADO';

CREATE INDEX IF NOT EXISTS ix_chat_reservas_conversa
  ON chat_reservas(conversa_id, estado);