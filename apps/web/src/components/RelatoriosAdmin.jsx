import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ROTULOS_METODO = {
  PRESENCIAL: 'Presencial',
  CARTAO: 'Cartão',
  MOBILE_MONEY: 'Mobile Money',
  MPESA: 'M-Pesa',
  EMOLA: 'e-Mola',
  MKESH: 'mKesh',
  CONTA_BANCARIA: 'Transferência bancária',
};

const ROTULOS_PERFIL = {
  FUNCIONARIO: 'Funcionário',
  ADMINISTRADOR: 'Administrador',
  MECANICO: 'Mecânico',
};

const fmtMoeda = (valor) => `${Number(valor ?? 0).toLocaleString('pt-PT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})} MZN`;

const fmtData = (valor) => valor
  ? new Date(valor).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' })
  : '—';

function dataMaputo(data) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Maputo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const valores = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function dataInicioPeriodo() {
  const agora = new Date();
  return {
    inicio: dataMaputo(new Date(agora.getTime() - 29 * 24 * 60 * 60 * 1000)),
    fim: dataMaputo(agora),
  };
}

function paraIsoMaputo(data, fimDoDia) {
  return new Date(`${data}T${fimDoDia ? '23:59:59.999' : '00:00:00'}+02:00`).toISOString();
}

function Indicador({ titulo, valor, detalhe }) {
  return (
    <article className="cartao kpi">
      <h3>{titulo}</h3>
      <p className="kpi-valor">{valor}</p>
      {detalhe && <small>{detalhe}</small>}
    </article>
  );
}

function RelatorioGeral({ dados }) {
  return (
    <>
      <div className="grelha-kpi">
        <Indicador titulo="Ordens de serviço" valor={dados.totalOS} detalhe="Criadas no período" />
        <Indicador titulo="Faturação confirmada" valor={fmtMoeda(dados.faturacaoTotal)} detalhe="Pagamentos recebidos" />
        <Indicador
          titulo="Tempo médio de reparação"
          valor={dados.tempoMedioReparacaoHoras === null ? '—' : `${dados.tempoMedioReparacaoHoras} h`}
          detalhe="Ordens concluídas"
        />
      </div>
      <section className="admin-indicadores" aria-labelledby="relatorio-negocio-titulo">
        <h3 id="relatorio-negocio-titulo">Visão geral do negócio</h3>
        <div className="grelha-kpi">
          <Indicador titulo="Clientes" valor={dados.indicadoresGestao.totalClientes} detalhe="Total registado" />
          <Indicador titulo="Serviços" valor={dados.indicadoresGestao.totalServicos} detalhe={`${dados.indicadoresGestao.totalServicosAtivos} ativos`} />
          <Indicador titulo="Mecânicos" valor={dados.indicadoresGestao.totalMecanicos} detalhe={`${dados.indicadoresGestao.totalMecanicosAtivos} contas ativas`} />
          <Indicador titulo="Unidades em stock" valor={dados.indicadoresGestao.unidadesStock} detalhe="Peças ativas" />
          <Indicador titulo="Stock baixo" valor={dados.indicadoresGestao.pecasStockBaixo} detalhe="Artigos com 5 unidades ou menos" />
          <Indicador titulo="Valor estimado do stock" valor={fmtMoeda(dados.indicadoresGestao.valorStock)} detalhe="Ao preço atual do catálogo" />
        </div>
      </section>
    </>
  );
}

function RelatorioFinanceiro({ dados }) {
  const maiorValor = Math.max(1, ...dados.financeiro.porDia.map((item) => Number(item.total)));
  return (
    <>
      <div className="grelha-kpi">
        <Indicador titulo="Receita confirmada" valor={fmtMoeda(dados.faturacaoTotal)} detalhe="No período selecionado" />
        <Indicador titulo="Pagamentos recebidos" valor={dados.financeiro.pagamentosConfirmados} detalhe="Transações confirmadas" />
      </div>
      <div className="grelha-2-colunas relatorio-subgrelha">
        <section className="cartao">
          <h3>Receita por método</h3>
          {dados.financeiro.porMetodo.length === 0 ? <p className="vazio">Sem pagamentos confirmados neste período.</p> : (
            <div className="tabela-responsiva">
              <table className="tabela">
                <thead><tr><th>Método</th><th>Transações</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {dados.financeiro.porMetodo.map((item) => (
                    <tr key={item.metodo}>
                      <td>{ROTULOS_METODO[item.metodo] ?? item.metodo}</td>
                      <td>{item.quantidade}</td>
                      <td className="num">{fmtMoeda(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="cartao">
          <h3>Receita diária</h3>
          {dados.financeiro.porDia.length === 0 ? <p className="vazio">Sem dados para apresentar.</p> : (
            <div className="relatorio-barras">
              {dados.financeiro.porDia.map((item) => (
                <div className="relatorio-barra-linha" key={String(item.data)}>
                  <time dateTime={String(item.data)}>{fmtData(item.data)}</time>
                  <span className="relatorio-barra-trilho">
                    <span style={{ width: `${Math.max(3, (Number(item.total) / maiorValor) * 100)}%` }} />
                  </span>
                  <strong>{fmtMoeda(item.total)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <p className="relatorio-nota">O relatório apresenta receita recebida, não lucro: custos e despesas ainda não são registados no sistema.</p>
    </>
  );
}

function RelatorioFuncionarios({ dados }) {
  return (
    <section className="cartao">
      <h3>Atividade da equipa</h3>
      <p className="hint">Ordens atribuídas e criadas durante o período selecionado. Os indicadores não representam avaliação individual de desempenho.</p>
      {dados.funcionarios.length === 0 ? <p className="vazio">Sem funcionários registados.</p> : (
        <div className="tabela-responsiva">
          <table className="tabela">
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Perfil</th>
                <th>OS atribuídas</th>
                <th>Concluídas</th>
                <th>Em andamento</th>
                <th>OS criadas</th>
                <th>Tempo médio</th>
              </tr>
            </thead>
            <tbody>
              {dados.funcionarios.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.nome}</strong></td>
                  <td>{ROTULOS_PERFIL[item.perfil] ?? item.perfil}</td>
                  <td>{item.ordensMecanico}</td>
                  <td>{item.ordensConcluidas}</td>
                  <td>{item.ordensAtivas}</td>
                  <td>{item.ordensCriadas}</td>
                  <td>{item.tempoMedioHoras === null ? '—' : `${item.tempoMedioHoras} h`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RelatorioOperacional({ dados }) {
  const estados = Object.entries(dados.osPorEstado);
  return (
    <div className="grelha-2-colunas">
      <section className="cartao">
        <h3>Ordens por estado</h3>
        {estados.length === 0 ? <p className="vazio">Sem ordens de serviço neste período.</p> : (
          <ul className="lista-simples">
            {estados.map(([estado, total]) => (
              <li key={estado}><span>{estado.replace(/_/g, ' ').toLowerCase()}</span><strong>{total}</strong></li>
            ))}
          </ul>
        )}
      </section>
      <section className="cartao">
        <h3>Serviços mais solicitados</h3>
        {dados.servicosMaisSolicitados.length === 0 ? <p className="vazio">Sem serviços associados a ordens neste período.</p> : (
          <div className="tabela-responsiva">
            <table className="tabela">
              <thead><tr><th>Serviço</th><th>Quantidade</th></tr></thead>
              <tbody>
                {dados.servicosMaisSolicitados.map((item) => (
                  <tr key={item.nome}><td>{item.nome}</td><td>{item.quantidade}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function RelatoriosAdmin() {
  const [dados, setDados] = useState(null);
  const [periodo, setPeriodo] = useState(dataInicioPeriodo);
  const [filtros, setFiltros] = useState(periodo);
  const [relatorio, setRelatorio] = useState('geral');
  const [geradoEm, setGeradoEm] = useState(null);
  const [erro, setErro] = useState('');
  const [aCarregar, setACarregar] = useState(true);

  useEffect(() => {
    let ativo = true;
    const query = new URLSearchParams({
      inicio: paraIsoMaputo(periodo.inicio, false),
      fim: paraIsoMaputo(periodo.fim, true),
    });

    api('GET', `/admin/dashboard?${query}`)
      .then((resultado) => {
        if (!ativo) return;
        setDados(resultado);
        setGeradoEm(new Date().toISOString());
        setErro('');
      })
      .catch((error) => { if (ativo) setErro(error.message); })
      .finally(() => { if (ativo) setACarregar(false); });
    return () => { ativo = false; };
  }, [periodo]);

  function aplicarPeriodo(event) {
    event.preventDefault();
    if (!filtros.inicio || !filtros.fim || filtros.inicio > filtros.fim) {
      setErro('Indique um intervalo válido, com a data inicial anterior ou igual à final.');
      return;
    }
    setErro('');
    setACarregar(true);
    setPeriodo({ ...filtros });
  }

  const titulos = {
    geral: 'Relatório de gestão',
    financeiro: 'Relatório financeiro',
    funcionarios: 'Relatório de funcionários',
    operacional: 'Relatório operacional',
  };

  if (aCarregar && !dados) return <p role="status">A carregar relatórios…</p>;
  if (erro && !dados) {
    return (
      <div>
        <p className="erro" role="alert">Não foi possível carregar os relatórios: {erro}</p>
        <button type="button" className="botao botao-secundario" onClick={() => {
          setErro('');
          setACarregar(true);
          setPeriodo((atual) => ({ ...atual }));
        }}>
          Tentar novamente
        </button>
      </div>
    );
  }
  if (!dados) return <p className="vazio">Sem dados disponíveis.</p>;

  return (
    <section className="relatorios-admin">
      <header className="relatorios-titulo">
        <div>
          <span className="landing-section-kicker">Análise da oficina</span>
          <h2>Relatórios</h2>
          <p>Consulte a gestão, finanças, equipa e operação num período à sua escolha.</p>
        </div>
        <button type="button" className="botao botao-secundario print-hide" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </button>
      </header>

      <nav className="relatorio-tipos print-hide" aria-label="Tipo de relatório">
        {Object.entries(titulos).map(([id, titulo]) => (
          <button
            type="button"
            className={`relatorio-tipo${relatorio === id ? ' ativo' : ''}`}
            aria-pressed={relatorio === id}
            key={id}
            onClick={() => setRelatorio(id)}
          >
            {titulo}
          </button>
        ))}
      </nav>

      <form className="cartao relatorio-filtros print-hide" onSubmit={aplicarPeriodo}>
        <div>
          <label htmlFor="relatorio-inicio">De</label>
          <input id="relatorio-inicio" type="date" value={filtros.inicio} required
            onChange={(event) => setFiltros((atual) => ({ ...atual, inicio: event.target.value }))} />
        </div>
        <div>
          <label htmlFor="relatorio-fim">Até</label>
          <input id="relatorio-fim" type="date" value={filtros.fim} required
            onChange={(event) => setFiltros((atual) => ({ ...atual, fim: event.target.value }))} />
        </div>
        <button className="botao botao-secundario" type="submit" disabled={aCarregar}>
          {aCarregar ? 'A atualizar…' : 'Aplicar período'}
        </button>
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="print-documento relatorio-print-area">
        <header className="relatorio-cabecalho">
          <div>
            <span>Oficina John e Filhos</span>
            <h2>{titulos[relatorio]}</h2>
            <p>Período: {fmtData(dados.periodo.inicio)} — {fmtData(dados.periodo.fim)}</p>
          </div>
          <small>Gerado em {fmtData(geradoEm)}</small>
        </header>
        {relatorio === 'geral' && <RelatorioGeral dados={dados} />}
        {relatorio === 'financeiro' && <RelatorioFinanceiro dados={dados} />}
        {relatorio === 'funcionarios' && <RelatorioFuncionarios dados={dados} />}
        {relatorio === 'operacional' && <RelatorioOperacional dados={dados} />}
        <p className="relatorio-nota">Documento de gestão baseado nos registos do sistema; não é documento fiscal.</p>
      </div>
    </section>
  );
}
