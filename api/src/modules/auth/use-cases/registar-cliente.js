import { passwordHasher } from '../domain/password-hasher.js';
import { validarDadosRegisto } from '../domain/validacoes.js';
import { erros } from '../../../shared/errors/domain-error.js';

// RF20: registo de cliente — identificador gerado, contacto único, senha com hash.
export function criarRegistarCliente({ utilizadorRepo, clienteRepo }) {
  return async function registarCliente({ nome, email, telefone, senha }) {
    const dados = validarDadosRegisto({ nome, email, telefone, senha });

    // Duplicados → erro compreensível (RF20). A unicidade real é da BD (unique index).
    if (dados.email && (await utilizadorRepo.procurarPorEmail(dados.email))) {
      throw erros.emailEmUso();
    }
    if (dados.telefone && (await utilizadorRepo.procurarPorTelefone(dados.telefone))) {
      throw erros.telefoneEmUso();
    }

    const passwordHash = await passwordHasher.hash(senha);
    const utilizador = await utilizadorRepo.criar({
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      passwordHash,
      perfil: 'CLIENTE',
    });
    await clienteRepo.criar({ utilizadorId: utilizador.id });

    return {
      id: utilizador.id,
      nome: utilizador.nome,
      email: utilizador.email,
      telefone: utilizador.telefone,
      perfil: utilizador.perfil,
    };
  };
}