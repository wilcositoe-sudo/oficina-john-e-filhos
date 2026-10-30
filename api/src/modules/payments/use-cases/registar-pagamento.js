import crypto from 'node:crypto';
import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { paraCentimos, deCentimos } from '../../quotes/domain/dinheiro.js';

// RN06: só OS CONCLUIDA aceita pagamento. DEC-D16: valor = total, sem parciais.
export function criarRegistarPagamento({ pagamentoRepo, osRepo, provider, confirmacao }) {
  return async function registarPagamento({ ordemId, utilizador, metodo, valor, idempotencyKey }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();

    if (os.estado !== 'CONCLUIDA') throw erros.osNaoElegivelPagamento(os.estado);

    const METODOS_DIGITAIS = ['CARTAO', 'MOBILE_MONEY'];
    if (metodo === 'PRESENCIAL') {
      if (!isStaff) throw erros.naoAutorizado(); // RF13: presencial só staff
    } else if (!METODOS_DIGITAIS.includes(metodo)) {
      throw new DomainError('VALIDACAO', 'Campo inválido: metodo. Use PRESENCIAL, CARTAO ou MOBILE_MONEY.', 422, { campo: 'metodo' });
    }

    // Saldo = total (DEC-D16). Pagamento digital: o SERVIDOR calcula — o browser não manda valor.
    const totalC = paraCentimos(os.valorTotal);
    if (metodo === 'PRESENCIAL') {
      const recebidoC = paraCentimos(valor);
      if (recebidoC === null || recebidoC !== totalC) {
        throw erros.valorPagamentoInvalido(deCentimos(totalC));
      }
    }

    // Idempotência (Doc 10 §10.1): repetir o mesmo pedido NÃO cria segunda cobrança
    const chave = idempotencyKey ?? null;
    if (chave) {
      const existente = await pagamentoRepo.procurarPorChaveIdempotencia(chave);
      if (existente && String(existente.ordemId) === String(ordemId)) {
        return { ...existente, idempotente: true };
      }
    }

    const referenciaInterna = `PAG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    if (metodo === 'PRESENCIAL') {
      const confirmado = await pagamentoRepo.criar({
        ordemId,
        valor: deCentimos(totalC),
        moeda: 'MZN',
        metodo,
        estado: 'CONFIRMADO',
        referenciaInterna,
        referenciaFornecedor: null,
        chaveIdempotencia: chave,
        criadoPor: utilizador.id,
      });
      // DEC-D17 + RF14: confirmação imediata segue o mesmo caminho do webhook
      await confirmacao(confirmado);
      return confirmado;
    }

    // Digital: nasce PENDENTE; o fornecedor fake devolve referência externa
    const intencao = await provider.createPayment({
      valor: deCentimos(totalC),
      moeda: 'MZN',
      metodo,
      referenciaInterna,
    });
    return pagamentoRepo.criar({
      ordemId,
      valor: deCentimos(totalC),
      moeda: 'MZN',
      metodo,
      estado: 'PENDENTE',
      referenciaInterna,
      referenciaFornecedor: intencao.referenciaFornecedor,
      chaveIdempotencia: chave,
      criadoPor: utilizador.id,
    });
  };
}