CREATE TABLE utilizadores (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL CHECK (length(trim(nome)) >= 2),
  email TEXT,
  telefone TEXT,
  password_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('CLIENTE','FUNCIONARIO','ADMINISTRADOR')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (email IS NOT NULL OR telefone IS NOT NULL)
);
CREATE UNIQUE INDEX ux_utilizadores_email ON utilizadores (lower(trim(email))) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX ux_utilizadores_telefone ON utilizadores (telefone) WHERE telefone IS NOT NULL;

CREATE TABLE clientes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  utilizador_id BIGINT NOT NULL UNIQUE REFERENCES utilizadores(id),
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE veiculos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  matricula TEXT NOT NULL UNIQUE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano SMALLINT CHECK (ano IS NULL OR ano BETWEEN 1950 AND 2100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE servicos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_base NUMERIC(12,2) NOT NULL CHECK (preco_base >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pecas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo TEXT UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  quantidade_stock INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_stock >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orcamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  veiculo_id BIGINT NOT NULL REFERENCES veiculos(id),
  criado_por BIGINT REFERENCES utilizadores(id),
  estado TEXT NOT NULL CHECK (estado IN ('SOLICITADO','EM_PREPARACAO','ENVIADO','APROVADO','REJEITADO','EXPIRADO','CONVERTIDO')),
  descricao_problema TEXT NOT NULL CHECK (length(trim(descricao_problema)) >= 10),
  validade_ate TIMESTAMPTZ,
  total_estimado NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_estimado >= 0),
  aprovado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE linhas_orcamento (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orcamento_id BIGINT NOT NULL REFERENCES orcamentos(id),
  servico_id BIGINT REFERENCES servicos(id),
  descricao_snapshot TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE ordens_servico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero_os TEXT NOT NULL UNIQUE,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  veiculo_id BIGINT NOT NULL REFERENCES veiculos(id),
  funcionario_id BIGINT REFERENCES utilizadores(id),
  orcamento_id BIGINT REFERENCES orcamentos(id),
  descricao_problema TEXT NOT NULL CHECK (length(trim(descricao_problema)) >= 10),
  estado TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (estado IN ('PENDENTE','AGUARDANDO_DIAGNOSTICO','EM_DIAGNOSTICO','AGUARDANDO_APROVACAO_ORCAMENTO','EM_REPARACAO','AGUARDANDO_PECAS','CONCLUIDA','PAGA','ENTREGUE','CANCELADA')),
  modalidade_entrega TEXT CHECK (modalidade_entrega IN ('LEVANTAMENTO','DOMICILIO')),
  taxa_entrega NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (taxa_entrega >= 0),
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  data_conclusao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE servicos_os (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  servico_id BIGINT NOT NULL REFERENCES servicos(id),
  descricao_snapshot TEXT NOT NULL,
  quantidade NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE pecas_os (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  peca_id BIGINT NOT NULL REFERENCES pecas(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE agendamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  veiculo_id BIGINT NOT NULL REFERENCES veiculos(id),
  ordem_id BIGINT REFERENCES ordens_servico(id),
  inicio_at TIMESTAMPTZ NOT NULL,
  fim_at TIMESTAMPTZ NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('SOLICITADO','CONFIRMADO','CANCELADO','CONCLUIDO','NAO_COMPARECEU')),
  criado_por BIGINT REFERENCES utilizadores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fim_at > inicio_at)
);

CREATE TABLE historico_estado (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  estado_anterior TEXT,
  estado_novo TEXT NOT NULL,
  utilizador_id BIGINT REFERENCES utilizadores(id),
  ocorrido_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo TEXT
);

CREATE TABLE pagamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  moeda CHAR(3) NOT NULL,
  metodo TEXT NOT NULL CHECK (metodo IN ('PRESENCIAL','CARTAO','MOBILE_MONEY','OUTRO')),
  estado TEXT NOT NULL CHECK (estado IN ('CRIADO','PENDENTE','CONFIRMADO','RECUSADO','CANCELADO','REEMBOLSADO','INCERTO')),
  referencia_interna TEXT NOT NULL UNIQUE,
  referencia_fornecedor TEXT,
  chave_idempotencia TEXT NOT NULL UNIQUE,
  ocorrido_at TIMESTAMPTZ,
  criado_por BIGINT REFERENCES utilizadores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recibos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pagamento_id BIGINT NOT NULL UNIQUE REFERENCES pagamentos(id),
  numero TEXT NOT NULL UNIQUE,
  emitido_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_documento JSONB NOT NULL,
  estado TEXT NOT NULL DEFAULT 'EMITIDO' CHECK (estado IN ('EMITIDO','ANULADO'))
);

CREATE TABLE avaliacoes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL UNIQUE REFERENCES ordens_servico(id),
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  classificacao SMALLINT NOT NULL CHECK (classificacao BETWEEN 1 AND 5),
  comentario TEXT,
  publicada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mensagens (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  remetente_id BIGINT NOT NULL REFERENCES utilizadores(id),
  conteudo TEXT NOT NULL CHECK (length(trim(conteudo)) > 0),
  enviado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  estado_entrega TEXT NOT NULL DEFAULT 'GUARDADA' CHECK (estado_entrega IN ('GUARDADA','ENVIADA','FALHOU'))
);

CREATE TABLE auditoria (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id BIGINT REFERENCES utilizadores(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  request_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE eventos_pagamento (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fornecedor TEXT NOT NULL,
  id_evento TEXT NOT NULL,
  recebido_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_at TIMESTAMPTZ,
  resultado TEXT,
  UNIQUE (fornecedor, id_evento)
);

CREATE INDEX ix_os_cliente_estado ON ordens_servico(cliente_id, estado);
CREATE INDEX ix_os_created_at ON ordens_servico(created_at DESC);
CREATE INDEX ix_agendamentos_inicio_estado ON agendamentos(inicio_at, estado);
CREATE INDEX ix_historico_os_ocorrido ON historico_estado(ordem_id, ocorrido_at DESC);
CREATE INDEX ix_mensagens_os_data ON mensagens(ordem_id, enviado_at DESC);
CREATE INDEX ix_pagamentos_os_estado ON pagamentos(ordem_id, estado);
CREATE INDEX ix_auditoria_ocorrido ON auditoria(occurred_at DESC);