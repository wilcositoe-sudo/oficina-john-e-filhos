ALTER TABLE pecas_os
  DROP CONSTRAINT IF EXISTS pecas_os_peca_id_fkey;

ALTER TABLE pecas_os
  ADD CONSTRAINT pecas_os_peca_id_fkey
  FOREIGN KEY (peca_id) REFERENCES pecas(id) ON DELETE SET NULL;

ALTER TABLE servicos_os
  DROP CONSTRAINT IF EXISTS servicos_os_servico_id_fkey;

ALTER TABLE servicos_os
  ADD CONSTRAINT servicos_os_servico_id_fkey
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL;

ALTER TABLE linhas_orcamento
  DROP CONSTRAINT IF EXISTS linhas_orcamento_servico_id_fkey;

ALTER TABLE linhas_orcamento
  ADD CONSTRAINT linhas_orcamento_servico_id_fkey
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE SET NULL;
