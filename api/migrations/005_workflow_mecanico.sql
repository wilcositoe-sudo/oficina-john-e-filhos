-- 1. Adicionar o novo perfil MECANICO
-- Removemos a constraint antiga e criamos uma nova que inclui 'MECANICO'
ALTER TABLE utilizadores DROP CONSTRAINT IF EXISTS utilizadores_perfil_check;
ALTER TABLE utilizadores ADD CONSTRAINT utilizadores_perfil_check 
CHECK (perfil IN ('CLIENTE','FUNCIONARIO','ADMINISTRADOR','MECANICO'));

-- 2. Adicionar colunas para a Taxa de Diagnóstico na OS
-- Estas colunas permitem cobrar o diagnóstico se o cliente rejeitar o orçamento
ALTER TABLE ordens_servico 
ADD COLUMN IF NOT EXISTS taxa_diagnostico NUMERIC(12,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS diagnostico_cobrado BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Atualizar a máquina de estados da OS
-- Adicionamos os novos estados do fluxo Mecânico -> Funcionário -> Cliente
ALTER TABLE ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_estado_check;
ALTER TABLE ordens_servico ADD CONSTRAINT ordens_servico_estado_check 
CHECK (estado IN (
    'PENDENTE', 
    'AGUARDANDO_DIAGNOSTICO', 
    'EM_DIAGNOSTICO',
    'AGUARDANDO_APROVACAO_ORCAMENTO', -- Mantido para compatibilidade com testes anteriores
    'EM_REPARACAO', 
    'AGUARDANDO_PECAS',
    'CONCLUIDA', 
    'PAGA', 
    'ENTREGUE', 
    'CANCELADA',
    'AGUARDANDO_PRECO_FUNCIONARIO',    -- NOVO: Mecânico acabou, Funcionário a precificar
    'AGUARDANDO_APROVACAO_CLIENTE',    -- NOVO: Funcionário enviou, Cliente a analisar
    'AGUARDANDO_VALIDACAO_FUNCIONARIO',-- NOVO: Cliente removeu itens, Funcionário a validar
    'REJEITADA'                        -- NOVO: Cliente rejeitou (gatilho para cobrar taxa)
));