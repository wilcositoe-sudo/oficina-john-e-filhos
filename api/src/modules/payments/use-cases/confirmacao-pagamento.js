// DEC-D17 + RF14: partilhado entre pagamento presencial e confirmação por webhook.
// Total coberto → OS transita CONCLUIDA → PAGA; recibo emitido uma só vez por pagamento.
export function criarConfirmacaoPagamento({ pagamentoRepo, osRepo }) {
  return async function confirmacaoPagamento(pagamento) {
    let osAtualizada = null;
    let recibo = null;

    const os = await osRepo.procurarPorId(pagamento.ordemId);
    if (!os) return { os: null, recibo: null };

    const soma = Number(await pagamentoRepo.somaConfirmada(os.id));
    const total = Number(os.valorTotal);
    if (soma >= total && os.estado === 'CONCLUIDA') {
      osAtualizada = await osRepo.transitar({
        ordemId: os.id,
        estadoAnterior: 'CONCLUIDA',
        estadoNovo: 'PAGA',
        utilizadorId: null, // ator: sistema
        motivo: `Pagamento confirmado (${pagamento.referenciaInterna})`,
      });
    }

    const linhas = await osRepo.listarLinhas(os.id);
    recibo = await pagamentoRepo.criarRecibo({
      pagamentoId: pagamento.id,
      snapshot: {
        numeroOS: os.numeroOS,
        estadoOS: osAtualizada?.estado ?? os.estado,
        metodo: pagamento.metodo,
        valor: pagamento.valor,
        moeda: pagamento.moeda,
        referenciaPagamento: pagamento.referenciaInterna,
        ocorridoAt: pagamento.ocorridoAt,
        linhas,
        totalOS: os.valorTotal,
      },
    });

    return { os: osAtualizada, recibo };
  };
}