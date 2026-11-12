import { criarCriarPeca } from './use-cases/criar-peca.js';
import { criarListarPecas } from './use-cases/listar-pecas.js';
import { criarAtualizarPeca } from './use-cases/atualizar-peca.js';
import { criarApagarPeca } from './use-cases/apagar-peca.js';

export function createPartsDependencies({ requireAuth, requireRole, pecaRepo }) {
  return {
    requireAuth,
    requireRole,
    criar: criarCriarPeca({ pecaRepo }),
    listar: criarListarPecas({ pecaRepo }),
    atualizar: criarAtualizarPeca({ pecaRepo }),
    apagar: criarApagarPeca({ pecaRepo }),
  };
}
