import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { podeEditar } from '../domain/estados.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF12: lança serviço com snapshot de preço (RN05B). OS fechada não aceita linhas.
export function criarAdicionarServico({ osRepo }) {
  return async function adicionarServico({ ordemId, servicoId, quantidade }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (!podeEditar(os.estado)) throw erros.transicaoInvalida(os.estado);

    const qtd = Number(quantidade ?? 1);
    if (!Number.isInteger(qtd) || qtd < 1) throw erroValidacao('quantidade', 'Inteiro >= 1.');

    const resultado = await osRepo.adicionarServico({ ordemId, servicoId, quantidade: qtd });
    return { ...resultado.linha, ordemId, valorTotal: resultado.valorTotal };
  };
}