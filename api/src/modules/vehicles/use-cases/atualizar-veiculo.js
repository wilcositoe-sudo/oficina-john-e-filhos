import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

const erroValidacao = (campo, mensagem) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${mensagem}`, 422, { campo });

export function criarAtualizarVeiculo({ veiculoRepo }) {
  return async function atualizarVeiculo({ id, utilizador, ...dados }) {
    const existente = await veiculoRepo.procurarPorId(id);
    if (!existente) throw erros.veiculoNaoEncontrado();
    if (!mesmaId(existente.utilizadorId, utilizador.id)) throw erros.naoAutorizado();

    const atualizado = {};
    if (Object.hasOwn(dados, 'matricula')) {
      const matricula = typeof dados.matricula === 'string'
        ? dados.matricula.trim().toUpperCase().replace(/\s+/g, '')
        : '';
      if (matricula.length < 4) throw erroValidacao('matricula', 'Formato inválido.');
      const comMesmaMatricula = await veiculoRepo.procurarPorMatricula(matricula);
      if (comMesmaMatricula && !mesmaId(comMesmaMatricula.id, id)) {
        throw erros.matriculaEmUso();
      }
      atualizado.matricula = matricula;
    }
    if (Object.hasOwn(dados, 'marca')) {
      const marca = typeof dados.marca === 'string' ? dados.marca.trim() : '';
      if (marca.length < 2) throw erroValidacao('marca', 'Mínimo 2 caracteres.');
      atualizado.marca = marca;
    }
    if (Object.hasOwn(dados, 'modelo')) {
      const modelo = typeof dados.modelo === 'string' ? dados.modelo.trim() : '';
      if (modelo.length < 1) throw erroValidacao('modelo', 'Obrigatório.');
      atualizado.modelo = modelo;
    }
    if (Object.hasOwn(dados, 'ano')) {
      const ano = dados.ano === '' || dados.ano === null ? null : Number(dados.ano);
      if (ano !== null && (!Number.isInteger(ano) || ano < 1950 || ano > 2100)) {
        throw erroValidacao('ano', 'Entre 1950 e 2100.');
      }
      atualizado.ano = ano;
    }
    if (Object.keys(atualizado).length === 0) {
      throw erroValidacao('dados', 'Indique pelo menos um campo para atualizar.');
    }

    const resultado = await veiculoRepo.atualizar({
      id,
      utilizadorId: utilizador.id,
      ...atualizado,
    });
    if (!resultado) throw erros.veiculoNaoEncontrado();
    return resultado;
  };
}
