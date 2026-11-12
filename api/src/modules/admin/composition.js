import { criarPgDashboardRepository } from './adapters/pg-dashboard-repository.js';
import { criarCriarContaInterna } from './use-cases/criar-conta-interna.js';
import { criarListarContasInternas } from './use-cases/listar-contas-internas.js';
import { criarAtualizarContaInterna } from './use-cases/atualizar-conta-interna.js';
import { criarApagarContaInterna } from './use-cases/apagar-conta-interna.js';
import { criarConsultarDashboard } from './use-cases/consultar-dashboard.js';
import { criarDefinirPermissaoCatalogo } from './use-cases/definir-permissao-catalogo.js';

export function createAdminDependencies({
  requireAuth,
  requireRole,
  utilizadorRepo,
  passwordHasher,
  moderarAvaliacoes,
}) {
  const dashboardRepo = criarPgDashboardRepository();
  return {
    requireAuth,
    requireRole,
    moderarAvaliacoes,
    criarConta: criarCriarContaInterna({ utilizadorRepo, passwordHasher }),
    listarContas: criarListarContasInternas({ utilizadorRepo }),
    atualizarConta: criarAtualizarContaInterna({ utilizadorRepo }),
    apagarConta: criarApagarContaInterna({ utilizadorRepo }),
    definirPermissaoCatalogo: criarDefinirPermissaoCatalogo({ utilizadorRepo }),
    dashboard: criarConsultarDashboard({ dashboardRepo }),
  };
}
