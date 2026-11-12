import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { IconClipboard, IconRefresh, IconWrench, IconCheck } from '../components/icons.jsx';

const ROTULOS = {
  PENDENTE: 'Pendente',
  AGUARDANDO_DIAGNOSTICO: 'A aguardar diagnóstico',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'A aguardar orçamento',
  AGUARDANDO_APROVACAO_CLIENTE: 'A aguardar cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'Em validação',
  AGUARDANDO_ATRIBUICAO_REPARACAO: 'A aguardar atribuição',
  AGUARDANDO_REPARACAO: 'A aguardar reparação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'A aguardar peças',
  CONCLUIDA: 'Concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

const ESTADOS_ATIVOS = new Set([
  'AGUARDANDO_DIAGNOSTICO',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_PRECO_FUNCIONARIO',
  'AGUARDANDO_APROVACAO_CLIENTE',
  'AGUARDANDO_VALIDACAO_FUNCIONARIO',
  'AGUARDANDO_ATRIBUICAO_REPARACAO',
  'AGUARDANDO_REPARACAO',
  'EM_REPARACAO',
  'AGUARDANDO_PECAS',
]);

const fmtData = (valor) =>
  valor
    ? new Date(valor).toLocaleDateString('pt-PT', {
        timeZone: 'Africa/Maputo',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const fmtMoeda = (valor) =>
  `${Number(valor ?? 0).toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MZN`;

export default function Dashboard({ utilizador, irParaOrdens }) {
  const [ordens, setOrdens] = useState(null);
  const [erro, setErro] = useState('');
  const [aAtualizar, setAAtualizar] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const path =
        utilizador.perfil === 'CLIENTE'
          ? '/ordens/meu'
          : utilizador.perfil === 'MECANICO'
            ? '/ordens/minhas'
            : '/ordens';
      setOrdens(await api('GET', path));
      setErro('');
    } catch (error) {
      setErro(error.message);
    } finally {
      setAAtualizar(false);
    }
  }, [utilizador.perfil]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function atualizar() {
    setAAtualizar(true);
    void carregar();
  }

  const resumo = useMemo(() => {
    const lista = ordens ?? [];
    return {
      total: lista.length,
      ativas: lista.filter((ordem) => ESTADOS_ATIVOS.has(ordem.estado)).length,
      concluidas: lista.filter((ordem) =>
        ['CONCLUIDA', 'PAGA', 'ENTREGUE'].includes(ordem.estado),
      ).length,
    };
  }, [ordens]);

  const nome = String(utilizador.nome ?? '').trim().split(/\s+/)[0] || 'Olá';
  const recentes = ordens?.slice(0, 5) ?? [];
  const papel =
    utilizador.perfil === 'CLIENTE'
      ? 'Acompanhe aqui o estado dos seus pedidos de serviço.'
      : utilizador.perfil === 'MECANICO'
        ? 'Veja as ordens de serviço atribuídas a si.'
        : 'Acompanhe a operação da oficina e as ordens mais recentes.';

  return (
    <section className="dashboard-page">
      <header className="dashboard-welcome">
        <div>
          <span className="landing-section-kicker">Painel de controlo</span>
          <h2>Bem-vindo, {nome}.</h2>
          <p>{papel}</p>
        </div>
        <button
          type="button"
          className="botao botao-secundario dashboard-refresh"
          onClick={atualizar}
          disabled={aAtualizar}
        >
          <IconRefresh style={{ margin: 0 }} />
          {aAtualizar ? 'A atualizar…' : 'Atualizar'}
        </button>
      </header>

      <div className="dashboard-hero">
        <div>
          <span>OFICINA JOHN E FILHOS · MOATIZE</span>
          <h3>O seu veículo, acompanhado em cada etapa.</h3>
          <p>
            Consulte as ordens de serviço e acompanhe o progresso do diagnóstico
            à conclusão.
          </p>
          <button type="button" onClick={irParaOrdens}>
            Ver ordens de serviço <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="dashboard-hero-art" aria-hidden="true">
          <IconWrench />
          <span>OJ</span>
        </div>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="dashboard-kpis" aria-live="polite">
        <article className="dashboard-kpi">
          <span className="dashboard-kpi-icon"><IconClipboard /></span>
          <span className="dashboard-kpi-label">Ordens de serviço</span>
          <strong>{ordens === null ? '—' : resumo.total}</strong>
          <small>Total visível para o seu perfil</small>
        </article>
        <article className="dashboard-kpi">
          <span className="dashboard-kpi-icon"><IconWrench /></span>
          <span className="dashboard-kpi-label">Em andamento</span>
          <strong>{ordens === null ? '—' : resumo.ativas}</strong>
          <small>Ordens em etapas de trabalho</small>
        </article>
        <article className="dashboard-kpi">
          <span className="dashboard-kpi-icon dashboard-kpi-icon-success"><IconCheck /></span>
          <span className="dashboard-kpi-label">Concluídas</span>
          <strong>{ordens === null ? '—' : resumo.concluidas}</strong>
          <small>Concluídas, pagas ou entregues</small>
        </article>
      </div>

      <section className="cartao dashboard-recent">
        <div className="dashboard-section-heading">
          <div>
            <span className="landing-section-kicker">Atividade</span>
            <h3>Ordens recentes</h3>
          </div>
          <button type="button" className="ligacao" onClick={irParaOrdens}>
            Ver todas
          </button>
        </div>

        {ordens === null ? (
          <p className={erro ? 'vazio' : 'dashboard-loading'}>
            {erro ? 'Não foi possível carregar as ordens. Use Atualizar para tentar novamente.' : 'A carregar ordens de serviço…'}
          </p>
        ) : recentes.length === 0 ? (
          <p className="vazio">Ainda não existem ordens de serviço para apresentar.</p>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ordem</th>
                  <th>Problema reportado</th>
                  <th>Data</th>
                  <th>Estado</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((ordem) => (
                  <tr key={ordem.id}>
                    <td><strong>{ordem.numeroOS || `OS #${ordem.id}`}</strong></td>
                    <td>{ordem.descricaoProblema || '—'}</td>
                    <td>{fmtData(ordem.createdAt)}</td>
                    <td>
                      <span className={`badge badge-${String(ordem.estado).toLowerCase()}`}>
                        {ROTULOS[ordem.estado] ?? ordem.estado}
                      </span>
                    </td>
                    <td className="num">{fmtMoeda(ordem.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
