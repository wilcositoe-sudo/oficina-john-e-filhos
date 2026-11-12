import { criarPgUtilizadorRepository } from './adapters/pg-utilizador-repository.js';
import { criarPgSessaoRepository } from './adapters/pg-sessao-repository.js';
import { bcryptPasswordHasher } from './adapters/bcrypt-password-hasher.js';
import { createRequireAuth } from './http/session-middleware.js';
import { criarRegistarCliente } from './use-cases/registar-cliente.js';
import { criarLogin } from './use-cases/login.js';
import { criarSolicitarRecuperacao } from './use-cases/solicitar-recuperacao.js';
import { criarConfirmarRecuperacao } from './use-cases/confirmar-recuperacao.js';
import { criarLogout } from './use-cases/logout.js';
import { criarAtualizarPerfil } from './use-cases/atualizar-perfil.js';
import { criarAtualizarFotoPerfil } from './use-cases/atualizar-foto-perfil.js';
import { criarAlterarSenha } from './use-cases/alterar-senha.js';

export function createAuthDependencies({ clienteRepo }) {
  const utilizadorRepo = criarPgUtilizadorRepository();
  const sessaoRepo = criarPgSessaoRepository();
  return {
    utilizadorRepo,
    passwordHasher: bcryptPasswordHasher,
    requireAuth: createRequireAuth({ sessaoRepo, utilizadorRepo }),
    atualizarPerfil: criarAtualizarPerfil({ utilizadorRepo }),
    atualizarFotoPerfil: criarAtualizarFotoPerfil({ utilizadorRepo }),
    alterarSenha: criarAlterarSenha({
      utilizadorRepo,
      sessaoRepo,
      passwordHasher: bcryptPasswordHasher,
    }),
    registarCliente: criarRegistarCliente({ utilizadorRepo, clienteRepo, passwordHasher: bcryptPasswordHasher }),
    login: criarLogin({ utilizadorRepo, sessaoRepo, passwordHasher: bcryptPasswordHasher }),
    solicitarRecuperacao: criarSolicitarRecuperacao({ utilizadorRepo }),
    confirmarRecuperacao: criarConfirmarRecuperacao({ utilizadorRepo, passwordHasher: bcryptPasswordHasher }),
    logout: criarLogout({ sessaoRepo }),
  };
}
