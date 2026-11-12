import { criarPgOrcamentoRepository } from './adapters/pg-orcamento-repository.js';
import { criarSolicitarOrcamento } from './use-cases/solicitar-orcamento.js';
import { criarListarOrcamentosCliente } from './use-cases/listar-orcamentos-cliente.js';
import { criarListarOrcamentosStaff } from './use-cases/listar-orcamentos-staff.js';
import { criarResponderOrcamento } from './use-cases/responder-orcamento.js';
import { criarDecidirOrcamento } from './use-cases/decidir-orcamento.js';

export function createQuotesDependencies({ requireAuth, requireRole, veiculoRepo }) {
  const orcamentoRepo = criarPgOrcamentoRepository();

  return {
    requireAuth,
    requireRole,
    casosDeUso: {
      solicitar: criarSolicitarOrcamento({ orcamentoRepo, veiculoRepo }),
      listarCliente: criarListarOrcamentosCliente({ orcamentoRepo }),
      listarStaff: criarListarOrcamentosStaff({ orcamentoRepo }),
      responder: criarResponderOrcamento({ orcamentoRepo }),
      decidir: criarDecidirOrcamento({ orcamentoRepo }),
    },
  };
}
