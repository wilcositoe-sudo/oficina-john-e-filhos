import { DomainError, erros } from '../../../shared/errors/domain-error.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

export function criarRegistarVeiculo({ veiculoRepo }) {
  return async function registarVeiculo({ utilizadorId, matricula, marca, modelo, ano }) {
    const mat = matricula?.trim().toUpperCase().replace(/\s+/g, '') ?? '';
    if (mat.length < 4) throw erroValidacao('matricula', 'Formato inválido.');

    const marcaTrim = marca?.trim() ?? '';
    if (marcaTrim.length < 2) throw erroValidacao('marca', 'Mínimo 2 caracteres.');
    const modeloTrim = modelo?.trim() ?? '';
    if (modeloTrim.length < 1) throw erroValidacao('modelo', 'Obrigatório.');

    const anoNum = ano === undefined || ano === null ? null : Number(ano);
    if (anoNum !== null && (!Number.isInteger(anoNum) || anoNum < 1950 || anoNum > 2100)) {
      throw erroValidacao('ano', 'Entre 1950 e 2100.');
    }

    if (await veiculoRepo.procurarPorMatricula(mat)) throw erros.matriculaEmUso();

    return veiculoRepo.criar({ utilizadorId, matricula: mat, marca: marcaTrim, modelo: modeloTrim, ano: anoNum });
  };
}