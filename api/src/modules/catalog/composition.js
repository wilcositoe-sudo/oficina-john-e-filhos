import { criarCriarServico } from './use-cases/criar-servico.js';
import { criarListarServicosPublico } from './use-cases/listar-servicos-publico.js';
import { criarListarTodosServicos } from './use-cases/listar-todos-servicos.js';
import { criarDesativarServico } from './use-cases/desativar-servico.js';
import { criarAtualizarServico } from './use-cases/atualizar-servico.js';
import { criarApagarServico } from './use-cases/apagar-servico.js';

export function createCatalogDependencies({ requireAuth, requireRole, servicoRepo }) {
  return {
    requireAuth,
    requireRole,
    criar: criarCriarServico({ servicoRepo }),
    listarPublico: criarListarServicosPublico({ servicoRepo }),
    listarTodos: criarListarTodosServicos({ servicoRepo }),
    desativar: criarDesativarServico({ servicoRepo }),
    atualizar: criarAtualizarServico({ servicoRepo }),
    apagar: criarApagarServico({ servicoRepo }),
  };
}
