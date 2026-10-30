import { erros } from '../../../shared/errors/domain-error.js';

// RF14: recibo só após confirmação (RN06). Reimpressão devolve o mesmo documento.
export function criarObterRecibo({ pagamentoRepo, osRepo }) {
  return async function obterRecibo({ pagamentoId, utilizador }) {
    const pagamento = await pagamentoRepo.procurarPorId(pagamentoId);
    if (!pagamento) throw erros.pagamentoNaoEncontrado();

    const os = await osRepo.procurarPorId(pagamento.ordemId);
    if (!os) throw erros.osNaoEncontrada();
    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();

    if (pagamento.estado !== 'CONFIRMADO') throw erros.pagamentoNaoConfirmado();

    const recibo = await pagamentoRepo.procurarReciboPorPagamento(pagamentoId);
    if (!recibo) throw erros.reciboNaoEncontrado();
    return recibo;
  };
}