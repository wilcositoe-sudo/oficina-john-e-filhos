import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { podeResponder } from '../domain/estados.js';
import { paraCentimos, deCentimos, subtotalCentimos } from '../domain/dinheiro.js';

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

const VALIDADE_PADRAO_DIAS = 7; // proposta DEC-D11, a validar com a oficina

export function criarResponderOrcamento({ orcamentoRepo }) {
  return async function responderOrcamento({ id, itens, validadeDias = VALIDADE_PADRAO_DIAS }) {
    const orc = await orcamentoRepo.procurarPorId(id);
    if (!orc) throw erros.orcamentoNaoEncontrado();
    if (!podeResponder(orc.estado)) throw erros.transicaoInvalida(orc.estado);

    if (!Array.isArray(itens) || itens.length === 0) {
      throw erroValidacao('itens', 'A proposta precisa de pelo menos uma linha.');
    }

    let total = 0;
    const linhas = itens.map((item, idx) => {
      const descricao = item.descricao?.trim() ?? '';
      if (descricao.length < 2) throw erroValidacao(`itens[${idx}].descricao`, 'Mínimo 2 caracteres.');
      const qtd = Number(item.quantidade ?? 1);
      if (!Number.isInteger(qtd) || qtd < 1) throw erroValidacao(`itens[${idx}].quantidade`, 'Inteiro >= 1.');
      const precoC = paraCentimos(item.precoUnitario);
      if (precoC === null) throw erroValidacao(`itens[${idx}].precoUnitario`, 'Formato 0.00 (máx. 2 casas).');
      const subC = subtotalCentimos(precoC, qtd);
      total += subC;
      return {
        descricao,
        quantidade: qtd,
        precoUnitario: deCentimos(precoC),
        subtotal: deCentimos(subC),
      };
    });

    const validadeAte = new Date(Date.now() + Number(validadeDias) * 24 * 60 * 60 * 1000);
    return orcamentoRepo.gravarResposta({
      id,
      linhas,
      totalEstimado: deCentimos(total),
      validadeAte,
    });
  };
}