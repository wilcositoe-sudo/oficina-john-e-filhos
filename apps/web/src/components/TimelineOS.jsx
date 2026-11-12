const ROTULO_ESTADO = {
  PENDENTE: 'Recebido',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'Aguarda preço',
  AGUARDANDO_APROVACAO_CLIENTE: 'Aguarda cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'Aguarda validação',
  AGUARDANDO_APROVACAO_ORCAMENTO: 'Aguarda aprovação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'Aguarda peças',
  CONCLUIDA: 'Concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

const ICONE = {
  PENDENTE: '📥', EM_DIAGNOSTICO: '🔍', AGUARDANDO_PRECO_FUNCIONARIO: '💰',
  AGUARDANDO_APROVACAO_CLIENTE: '📋', AGUARDANDO_VALIDACAO_FUNCIONARIO: '✂️',
  AGUARDANDO_APROVACAO_ORCAMENTO: '📋', EM_REPARACAO: '🔧', AGUARDANDO_PECAS: '📦',
  CONCLUIDA: '✅', PAGA: '💳', ENTREGUE: '🚗', REJEITADA: '❌', CANCELADA: '🚫',
};

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

// Timeline visual estilo "Uber" construída 100% sobre historico_estado
// (endpoint /ordens/:id/historico já existente — zero backend novo).
export default function TimelineOS({ historico }) {
  if (!historico || historico.length === 0) {
    return <p className="vazio"><small>Sem movimentos registados.</small></p>;
  }
  return (
    <ol className="timeline">
      {historico.map((h, i) => {
        const estado = h.estadoNovo;
        const ultimo = i === historico.length - 1;
        return (
          <li key={h.id ?? i} className={`timeline-item ${ultimo ? 'timeline-atual' : ''}`}>
            <span className="timeline-icone" aria-hidden>{ICONE[estado] ?? '•'}</span>
            <div className="timeline-conteudo">
              <strong>{ROTULO_ESTADO[estado] ?? estado}</strong>
              <div className="timeline-meta"><small>{fmtData(h.ocorridoAt)}</small></div>
              {h.motivo && <div className="timeline-motivo"><em>{h.motivo}</em></div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}