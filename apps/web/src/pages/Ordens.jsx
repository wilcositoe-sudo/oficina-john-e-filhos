import { useEffect, useState } from 'react';
import { api, API_BASE } from '../lib/api.js';
import ChatOS from '../components/ChatOS.jsx';
import FormularioAvaliacaoOS from '../components/FormularioAvaliacaoOS.jsx';
import { PainelPrecificacao, ValidarCortes } from '../components/PainelPrecificacao.jsx';
import TimelineOS from '../components/TimelineOS.jsx';
import { useFeedback } from '../components/Feedback.jsx';
import {
  IconClock, IconUser, IconWrench, IconClipboard, IconCheck,
  IconScissors, IconX,
} from '../components/icons.jsx';

// ★ Fase 5 — ROTULO_ESTADO limpo, sem chaves duplicadas.
const ROTULO_ESTADO = {
  PENDENTE: 'Pendente',
  AGUARDANDO_DIAGNOSTICO: 'Aguarda início do mecânico',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'Aguarda preço (func.)',
  AGUARDANDO_APROVACAO_CLIENTE: 'Aguarda cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'Aguarda validação da edição',
  AGUARDANDO_ATRIBUICAO_REPARACAO: 'Aguarda atribuição de reparação',
  AGUARDANDO_REPARACAO: 'Aguarda reparação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'Aguard. peças',
  CONCLUIDA: 'Reparação concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
  // Retrocompatibilidade com fluxos antigos
  AGUARDANDO_APROVACAO_ORCAMENTO: 'Aguard. aprovação',
};

// ★ Fase 5 — ACOES_POR_ESTADO do staff.
const ACOES_POR_ESTADO = {
  PENDENTE: ['cancelar'],
  AGUARDANDO_DIAGNOSTICO: ['cancelar'],
  EM_DIAGNOSTICO: ['cancelar'],
  AGUARDANDO_PRECO_FUNCIONARIO: ['cancelar'],
  AGUARDANDO_APROVACAO_CLIENTE: ['cancelar'],
  AGUARDANDO_VALIDACAO_FUNCIONARIO: ['cancelar'],
  AGUARDANDO_ATRIBUICAO_REPARACAO: ['cancelar'],
  AGUARDANDO_REPARACAO: ['cancelar'],
  AGUARDANDO_APROVACAO_ORCAMENTO: ['iniciar_reparacao', 'cancelar'],
  EM_REPARACAO: ['aguardar_pecas', 'cancelar'],
  AGUARDANDO_PECAS: ['iniciar_reparacao', 'cancelar'],
  CONCLUIDA: [],
  PAGA: ['entregar'],
  ENTREGUE: [],
  REJEITADA: [],
  CANCELADA: [],
};

const ESTADOS_EDITAVEIS = [
  'PENDENTE',
  'EM_DIAGNOSTICO',
  'AGUARDANDO_APROVACAO_ORCAMENTO',
  'EM_REPARACAO',
  'AGUARDANDO_PECAS',
];

const ROTULO_ACAO = {
  iniciar_diagnostico: 'Iniciar diagnóstico',
  aguardar_aprovacao: 'Aguardar aprovação',
  iniciar_reparacao: 'Iniciar reparação',
  aguardar_pecas: 'Aguardar peças',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
  entregar: 'Confirmar entrega',
};

const ROTULO_METODO = {
  PRESENCIAL: 'Presencial',
  CARTAO: 'Cartão',
  MOBILE_MONEY: 'Mobile Money',
  MPESA: 'M-Pesa',
  EMOLA: 'e-Mola',
  MKESH: 'mKesh',
  CONTA_BANCARIA: 'Transferência bancária',
};
const ROTULO_PAG_ESTADO = { PENDENTE: 'A aguardar', CONFIRMADO: 'Pago', RECUSADO: 'Recusado', CANCELADO: 'Cancelado' };
const ROTULO_MODALIDADE = { LEVANTAMENTO: 'Levantamento na oficina (Grátis)', DOMICILIO: 'Entrega ao domicílio (+500.00 MZN)' };

const fmtData = (iso) => (iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—');
const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;
const novaChave = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

// ★ Fase 5 — helper para nome de peça/serviço, com fallback para CUSTOM.
function nomeItem(item, fallbackPrefixo) {
  const snapshot = item?.descricao_snapshot ?? item?.descricaoSnapshot;
  if (snapshot) return snapshot;

  const id = item?.peca_id ?? item?.servico_id ?? item?.pecaId ?? item?.servicoId;
  if (id != null) return `${fallbackPrefixo} #${id}`;

  return `${fallbackPrefixo} personalizado`;
}

export default function Ordens({ perfil }) {
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil);
  return isStaff ? <VistaStaff perfil={perfil} /> : <VistaCliente perfil={perfil} />;
}

// ===================== CLIENTE =====================
function VistaCliente({ perfil }) {
  const [lista, setLista] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() { setLista(await api('GET', '/ordens/meu')); }
  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, []);

  async function abrir(id) {
    setErro('');
    try {
      const [os, linhas, historico] = await Promise.all([
        api('GET', `/ordens/${id}`),
        api('GET', `/ordens/${id}/linhas`),
        api('GET', `/ordens/${id}/historico`),
      ]);
      setDetalhe({ os, linhas, historico });
    } catch (err) { setErro(err.message); }
  }

  if (lista === null) return <p className="centro">A carregar…</p>;

  return (
    <section>
      <h2>As minhas ordens de serviço</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {lista.length === 0 ? (
        <p className="vazio">Sem ordens de serviço.</p>
      ) : (
        <table className="tabela">
          <thead><tr><th>Número</th><th>Estado</th><th>Total</th><th>Criada em</th><th></th></tr></thead>
          <tbody>
            {lista.map((o) => (
              <tr key={o.id}>
                <td>{o.numeroOS}</td>
                <td><span className={`badge badge-${o.estado.toLowerCase()}`}>{ROTULO_ESTADO[o.estado] ?? o.estado}</span></td>
                <td>{fmtMoeda(o.valorTotal)}</td>
                <td>{fmtData(o.createdAt)}</td>
                <td><button className="botao botao-secundario" onClick={() => abrir(o.id)}>Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {detalhe && (
        <>
          <PainelDetalhe detalhe={detalhe} mostrarAcoes={false} />

          {detalhe.os.estado === 'AGUARDANDO_APROVACAO_CLIENTE' && (
            <DecisaoCliente os={detalhe.os} linhas={detalhe.linhas} aoMudar={() => abrir(detalhe.os.id)} />
          )}

          {/* ★ Fase 5 — aviso quando a edição do cliente está pendente de validação. */}
          {detalhe.os.estado === 'AGUARDANDO_VALIDACAO_FUNCIONARIO' && (
            <div className="cartao" style={{ marginTop: 16, background: '#FFF8E1', border: '1px solid #FFE082' }}>
              <h3><IconClock /> Edição em análise</h3>
              <p className="hint">
                Enviaste uma revisão da proposta. O funcionário está a validar os itens que marcaste para remoção.
                Quando a validação terminar, a OS volta para ti (se a edição for rejeitada) ou avança para reparação (se aprovada).
              </p>
            </div>
          )}

          {/* ★ Fase 5 — entrega só depois da reparação concluída. */}
          {detalhe.os.estado === 'CONCLUIDA' && (
            <EntregaOS os={detalhe.os} aoMudar={() => abrir(detalhe.os.id)} />
          )}

          <PagamentosOS os={detalhe.os} isStaff={false} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          {detalhe.os.estado === 'ENTREGUE' && <FormularioAvaliacaoOS os={detalhe.os} />}
          <ChatOS ordemId={detalhe.os.id} perfil={perfil} />
        </>
      )}
    </section>
  );
}

// ===================== STAFF =====================
function VistaStaff({ perfil }) {
  const feedback = useFeedback();
  const [lista, setLista] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [veiculosCliente, setVeiculosCliente] = useState([]);
  const [veiculoId, setVeiculoId] = useState('');
  const [descricao, setDescricao] = useState('');

  async function carregar() {
    setLista(await api('GET', '/ordens'));
  }
  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, []);

  async function abrir(id) {
    setErro('');
    try {
      const [os, linhas, historico] = await Promise.all([
        api('GET', `/ordens/${id}`),
        api('GET', `/ordens/${id}/linhas`),
        api('GET', `/ordens/${id}/historico`),
      ]);
      setDetalhe({ os, linhas, historico });
    } catch (err) { setErro(err.message); }
  }

  async function carregarVeiculosDoCliente() {
    setErro(''); setVeiculoId('');
    try {
      const vs = await api('GET', `/clientes/${encodeURIComponent(emailCliente.trim())}/veiculos`);
      setVeiculosCliente(vs);
      if (vs.length > 0) setVeiculoId(vs[0].id);
    } catch (err) { setErro(err.message); setVeiculosCliente([]); }
  }

  async function criarOs(e) {
    e.preventDefault();
    const r = await feedback.executar(
      () => api('POST', '/ordens', { body: { emailCliente: emailCliente.trim(), veiculoId: Number(veiculoId), descricaoProblema: descricao } }),
      { sucesso: 'Ordem de serviço criada', sucessoDetalhe: 'A OS está pronta para atribuir ao mecânico.', carregando: 'A criar OS…' },
    );
    if (r.ok) {
      setDescricao('');
      await carregar();
      await abrir(r.data.id);
    }
  }

  async function executarAcao(acao) {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${detalhe.os.id}/transicoes`, { body: { acao, motivo: acao === 'cancelar' ? 'Cancelado pela oficina' : undefined } }),
      { sucesso: `Estado atualizado: ${ROTULO_ACAO[acao] ?? acao}`, carregando: 'A atualizar estado…' },
    );
    if (r.ok) { await abrir(detalhe.os.id); await carregar(); }
  }

  if (lista === null) return <p className="centro">A carregar…</p>;
  const acoesDisponiveis = detalhe ? (ACOES_POR_ESTADO[detalhe.os.estado] ?? []) : [];
  const ocupado = feedback.aExecutando;

  // ★ Fase 5 — detectar se a atribuição é de diagnóstico ou de reparação.
  const ehAtribuicaoReparacao = detalhe?.os.estado === 'AGUARDANDO_ATRIBUICAO_REPARACAO';
  const ehAtribuicaoDiagnostico = detalhe && ['PENDENTE', 'AGUARDANDO_DIAGNOSTICO'].includes(detalhe.os.estado);

  return (
    <section>
      <h2>Nova ordem de serviço</h2>
      <form className="cartao form-servico form-os" onSubmit={criarOs}>
        <fieldset className="form-passo">
          <legend>1 · Cliente</legend>
          <label htmlFor="emailCliente">E-mail do cliente</label>
          <div className="linha-row">
            <input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} placeholder="cliente@exemplo.co.mz" required />
            <button type="button" className="botao botao-secundario" onClick={carregarVeiculosDoCliente} disabled={!emailCliente.trim() || ocupado} aria-busy={ocupado}>Carregar veículos</button>
          </div>
          <small className="hint">Introduz o e-mail e carrega para ver os veículos registados.</small>
        </fieldset>

        <fieldset className="form-passo">
          <legend>2 · Veículo</legend>
          {veiculosCliente.length > 0 ? (
            <>
              <label htmlFor="veiculoOs">Veículo do cliente</label>
              <select id="veiculoOs" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
                {veiculosCliente.map((v) => (<option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>))}
              </select>
            </>
          ) : (
            <p className="vazio"><small>Sem veículo selecionado. Carrega os veículos do cliente no passo 1.</small></p>
          )}
        </fieldset>

        <fieldset className="form-passo">
          <legend>3 · Problema reportado</legend>
          <label htmlFor="descricaoOs">Descrição do problema (mín. 10 caracteres)</label>
          <textarea id="descricaoOs" rows="3" minLength={10} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: ruído ao travar, luz do motor acesa, ar condicionado não gela…" required />
        </fieldset>

        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit" disabled={!veiculoId || !descricao.trim() || ocupado} aria-busy={ocupado}>Criar OS</button>
      </form>

      <h2>Todas as ordens de serviço</h2>
      <table className="tabela">
        <thead><tr><th>Número</th><th>Estado</th><th>Total</th><th>Criada em</th><th></th></tr></thead>
        <tbody>
          {lista.map((o) => (
            <tr key={o.id}>
              <td>{o.numeroOS}</td>
              <td><span className={`badge badge-${o.estado.toLowerCase()}`}>{ROTULO_ESTADO[o.estado] ?? o.estado}</span></td>
              <td>{fmtMoeda(o.valorTotal)}</td>
              <td>{fmtData(o.createdAt)}</td>
              <td><button className="botao botao-secundario" onClick={() => abrir(o.id)}>Abrir</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {detalhe && (
        <>
          <PainelDetalhe detalhe={detalhe} mostrarAcoes={true} />

          {/* ★ Fase 5 — atribuição de mecânico de diagnóstico (antes do mecânico iniciar). */}
          {ehAtribuicaoDiagnostico && (
            <AtribuirMecanico
              os={detalhe.os}
              mecanicoAtualId={detalhe.os.mecanicoId}
              aoMudar={() => abrir(detalhe.os.id)}
              titulo={<><IconUser /> Atribuir a mecânico (diagnóstico)</>}
              sucessoMensagem="OS atribuída ao mecânico para diagnóstico."
              sucessoDetalhe="A OS passou para 'Aguarda início do mecânico'."
            />
          )}

          {/* ★ Fase 5 — atribuição de mecânico de reparação (depois do cliente aprovar). */}
          {ehAtribuicaoReparacao && (
            <AtribuirMecanico
              os={detalhe.os}
              mecanicoAtualId={detalhe.os.mecanicoId}
              aoMudar={() => abrir(detalhe.os.id)}
              titulo={<><IconWrench /> Atribuir mecânico de reparação</>}
              sucessoMensagem="Mecânico de reparação atribuído."
              sucessoDetalhe="A OS passou para 'Aguarda reparação'. O mecânico pode iniciar."
              hint="Podes escolher um mecânico diferente do que fez o diagnóstico."
            />
          )}

          {detalhe.os.estado === 'AGUARDANDO_PRECO_FUNCIONARIO' && (
            <PainelPrecificacao os={detalhe.os} linhas={detalhe.linhas} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          )}

          {detalhe.os.estado === 'AGUARDANDO_VALIDACAO_FUNCIONARIO' && (
            <ValidarCortes os={detalhe.os} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          )}

          {acoesDisponiveis.length > 0 && (
            <div className="cartao" style={{ marginTop: 16 }}>
              <h3>Transições de estado</h3>
              {acoesDisponiveis.map((a) => (
                <button key={a} className={a === 'cancelar' ? 'botao botao-perigo' : 'botao'} style={{ marginRight: 8, marginTop: 4 }} onClick={() => executarAcao(a)} disabled={ocupado} aria-busy={ocupado}>
                  {ROTULO_ACAO[a]}
                </button>
              ))}
            </div>
          )}

          <PagamentosOS os={detalhe.os} isStaff={true} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          <ChatOS ordemId={detalhe.os.id} perfil={perfil} />
        </>
      )}
    </section>
  );
}

// ===================== PAINEL DE DETALHE =====================
function PainelDetalhe({ detalhe, mostrarAcoes }) {
  const { os, linhas, historico } = detalhe;
  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <div className="orcamento-cabecalho">
        <strong>{os.numeroOS}</strong>
        <span className={`badge badge-${os.estado.toLowerCase()}`}>{ROTULO_ESTADO[os.estado] ?? os.estado}</span>
        <span className="orcamento-total">{fmtMoeda(os.valorTotal)}</span>
      </div>
      <p>{os.descricaoProblema}</p>
      {os.modalidadeEntrega && (
        <p><small>Entrega: {ROTULO_MODALIDADE[os.modalidadeEntrega] ?? os.modalidadeEntrega}
        {Number(os.taxaEntrega) > 0 && ` (${fmtMoeda(os.taxaEntrega)})`}</small></p>
      )}
      {Number(os.taxaDiagnostico) > 0 && (
        <p><small>Taxa de diagnóstico: {fmtMoeda(os.taxaDiagnostico)} {os.diagnosticoCobrado && '(cobrada)'}</small></p>
      )}
      {os.dataConclusao && <p><small>Concluída em {fmtData(os.dataConclusao)}</small></p>}
      {(linhas.servicos.length > 0 || linhas.pecas.length > 0) && (
        <table className="tabela" style={{ marginTop: 8 }}>
          <thead><tr><th>Tipo</th><th>Descrição</th><th>Origem</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
          <tbody>
            {linhas.servicos.map((l) => (
              <tr key={`s${l.id}`}>
                <td>Serviço</td>
                <td>{nomeItem(l, 'Serviço')}</td>
                <td>{l.origem === 'CUSTOM' ? <span className="badge-personalizado">personalizado</span> : 'catálogo'}</td>
                <td>{l.quantidade}</td>
                <td>{fmtMoeda(l.preco_unitario)}</td>
                <td>{fmtMoeda(l.subtotal)}</td>
              </tr>
            ))}
            {linhas.pecas.map((l) => (
              <tr key={`p${l.id}`}>
                <td>Peça</td>
                <td>{nomeItem(l, 'Peça')}</td>
                <td>{l.origem === 'CUSTOM' ? <span className="badge-personalizado">personalizado</span> : 'catálogo'}</td>
                <td>{l.quantidade}</td>
                <td>{fmtMoeda(l.preco_unitario)}</td>
                <td>{fmtMoeda(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h4 style={{ marginTop: 16 }}>Linha do tempo</h4>
      <TimelineOS historico={historico} />
      {!mostrarAcoes && <p className="vazio"><small>Acompanhe o estado da sua reparação aqui.</small></p>}
    </div>
  );
}

// ===================== DECISÃO DO CLIENTE =====================
function DecisaoCliente({ os, linhas, aoMudar }) {
  const feedback = useFeedback();
  const [remover, setRemover] = useState({});
  const ocupado = feedback.aExecutando;

  const itens = [
    ...linhas.servicos.map((s) => ({
      chave: `s${s.id}`,
      tipo: 'servico',
      linhaId: s.id,
      nome: nomeItem(s, 'Serviço'),
      qtd: Number(s.quantidade),
      preco: Number(s.preco_unitario),
      origem: s.origem ?? 'CATALOGO',
    })),
    ...linhas.pecas.map((p) => ({
      chave: `p${p.id}`,
      tipo: 'peca',
      linhaId: p.id,
      nome: nomeItem(p, 'Peça'),
      qtd: Number(p.quantidade),
      preco: Number(p.preco_unitario),
      origem: p.origem ?? 'CATALOGO',
    })),
  ];

  const taxaEntrega = Number(os.taxaEntrega ?? 0);
  const totalOriginal = itens.reduce((a, i) => a + i.preco * i.qtd, 0) + taxaEntrega;
  const totalRevisado = itens.filter((i) => !remover[i.chave]).reduce((a, i) => a + i.preco * i.qtd, 0) + taxaEntrega;
  const temSelecao = itens.some((i) => remover[i.chave]);

  async function decidir(acao) {
    const msg = acao === 'aprovar' ? 'Orçamento aprovado' : acao === 'rejeitar' ? 'Orçamento rejeitado' : 'Revisão enviada ao funcionário';
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/decisao`, { body: { acao, itensRemover: itens.filter((i) => remover[i.chave]).map((i) => ({ tipo: i.tipo, linhaId: i.linhaId })) } }),
      { sucesso: msg, carregando: 'A enviar decisão…' },
    );
    if (r.ok) aoMudar?.();
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3><IconClipboard /> Orçamento — {os.numeroOS}</h3>
      <p className="subtitulo">Revê os itens. Desmarca os que consideras desnecessários e envia a revisão, ou aprova/rejeita tudo.</p>

      <table className="tabela" style={{ marginTop: 8 }}>
        <thead><tr><th>Manter?</th><th>Tipo</th><th>Descrição</th><th>Origem</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.chave} className={remover[i.chave] ? 'linha-marcada' : ''} style={{ opacity: remover[i.chave] ? 0.45 : 1 }}>
              <td><input type="checkbox" checked={!remover[i.chave]} onChange={() => setRemover({ ...remover, [i.chave]: !remover[i.chave] })} disabled={ocupado} aria-label={`Manter ${i.nome}`} /></td>
              <td>{i.tipo === 'servico' ? 'Serviço' : 'Peça'}</td>
              <td style={{ textDecoration: remover[i.chave] ? 'line-through' : 'none' }}>{i.nome}</td>
              <td>{i.origem === 'CUSTOM' ? <span className="badge-personalizado">personalizado</span> : 'catálogo'}</td>
              <td>{i.qtd}</td>
              <td>{fmtMoeda(i.preco)}</td>
              <td>{fmtMoeda(i.preco * i.qtd)}</td>
            </tr>
          ))}
          {itens.length === 0 && <tr><td colSpan="7" className="vazio">Sem itens lançados.</td></tr>}
        </tbody>
      </table>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>Total original: <strong>{fmtMoeda(totalOriginal)}</strong></span>
        {temSelecao && <span>Total revisado: <strong style={{ color: 'var(--destaque)' }}>{fmtMoeda(totalRevisado)}</strong></span>}
      </div>
      {Number(os.taxaDiagnostico) > 0 && (
        <p><small>Nota: se rejeitares o orçamento, será cobrada a taxa de diagnóstico de {fmtMoeda(os.taxaDiagnostico)}.</small></p>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="botao" onClick={() => decidir('aprovar')} disabled={ocupado} aria-busy={ocupado}><IconCheck /> Aprovar tudo</button>
        <button className="botao botao-secundario" onClick={() => decidir('modificar')} disabled={ocupado || !temSelecao} aria-busy={ocupado}><IconScissors /> Enviar revisão ({itens.filter((i) => remover[i.chave]).length} a remover)</button>
        <button className="botao botao-perigo" onClick={() => decidir('rejeitar')} disabled={ocupado} aria-busy={ocupado}><IconX /> Rejeitar orçamento</button>
      </div>
    </div>
  );
}

// ===================== ATRIBUIR MECÂNICO (Fase 5 — genérico) =====================
function AtribuirMecanico({
  os,
  mecanicoAtualId,
  aoMudar,
  titulo = <><IconUser /> Atribuir a mecânico</>,
  sucessoMensagem = 'OS atribuída ao mecânico.',
  sucessoDetalhe = 'A OS passou para "Aguarda início do mecânico".',
  hint,
}) {
  const feedback = useFeedback();
  const [mecanicos, setMecanicos] = useState([]);
  const [sel, setSel] = useState(mecanicoAtualId ? String(mecanicoAtualId) : '');
  const ocupado = feedback.aExecutando;

  useEffect(() => { api('GET', '/ordens/mecanicos').then(setMecanicos).catch(() => {}); }, []);

  async function atribuir() {
    if (!sel) { feedback.mostrarErro('Escolhe um mecânico.'); return; }
    const r = await feedback.executar(
      () => api('PATCH', `/ordens/${os.id}/atribuir-mecanico`, { body: { mecanicoId: Number(sel) } }),
      { sucesso: sucessoMensagem, sucessoDetalhe, carregando: 'A atribuir…' },
    );
    if (r.ok) aoMudar?.();
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3>{titulo}</h3>
      {hint && <p className="hint">{hint}</p>}
      <div className="linha-row">
        <select value={sel} onChange={(e) => setSel(e.target.value)} disabled={ocupado}>
          <option value="">— escolher mecânico —</option>
          {mecanicos.map((m) => (<option key={m.id} value={m.id}>{m.nome} ({m.email})</option>))}
        </select>
        <button className="botao" onClick={atribuir} disabled={ocupado} aria-busy={ocupado}>Atribuir</button>
      </div>
    </div>
  );
}

// ===================== ENTREGA =====================
function EntregaOS({ os, aoMudar }) {
  const feedback = useFeedback();
  const [modalidade, setModalidade] = useState(os.modalidadeEntrega ?? 'LEVANTAMENTO');
  const [enderecoEntrega, setEnderecoEntrega] = useState(os.enderecoEntrega ?? '');
  const [coordenadasEntrega, setCoordenadasEntrega] = useState(
    os.entregaLat != null && os.entregaLng != null
      ? { lat: os.entregaLat, lng: os.entregaLng }
      : null,
  );
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const ocupado = feedback.aExecutando;

  function usarLocalizacaoAtual() {
    setErroLocalizacao('');
    if (!navigator.geolocation) {
      setErroLocalizacao('Este navegador não disponibiliza geolocalização.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicao) => setCoordenadasEntrega({
        lat: posicao.coords.latitude,
        lng: posicao.coords.longitude,
      }),
      (error) => setErroLocalizacao(
        error.code === 1
          ? 'Autorize o acesso à localização ou introduza o endereço manualmente.'
          : 'Não foi possível obter a localização. Pode introduzir o endereço manualmente.',
      ),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  }

  async function guardar() {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/entrega`, {
        body: {
          modalidade,
          enderecoEntrega,
          lat: coordenadasEntrega?.lat ?? null,
          lng: coordenadasEntrega?.lng ?? null,
        },
      }),
      { sucesso: 'Modalidade de entrega guardada', sucessoDetalhe: 'O total foi atualizado. Paga agora.', carregando: 'A guardar…' },
    );
    if (r.ok) aoMudar?.();
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3>Modalidade de entrega</h3>
      <p className="hint">O carro está pronto. Escolhe como queres recebê-lo e depois realiza o pagamento.</p>
      <div className="linha-row">
        <select value={modalidade} onChange={(e) => setModalidade(e.target.value)} disabled={ocupado}>
          <option value="LEVANTAMENTO">Levantamento na oficina (Grátis)</option>
          <option value="DOMICILIO">Entrega ao domicílio (+500.00 MZN)</option>
        </select>
        <button className="botao botao-secundario" onClick={guardar} disabled={ocupado} aria-busy={ocupado}>Guardar</button>
      </div>
      {modalidade === 'DOMICILIO' && (
        <div className="entrega-endereco">
          <label htmlFor={`endereco-entrega-${os.id}`}>Endereço completo para entrega</label>
          <textarea
            id={`endereco-entrega-${os.id}`}
            value={enderecoEntrega}
            onChange={(event) => setEnderecoEntrega(event.target.value)}
            placeholder="Bairro, rua, número da casa e ponto de referência"
            rows={3}
            required
          />
          <button type="button" className="botao botao-secundario" onClick={usarLocalizacaoAtual} disabled={ocupado}>
            Usar a minha localização atual
          </button>
          {coordenadasEntrega && <small>Coordenadas guardadas para mostrar o endereço no mapa.</small>}
          {erroLocalizacao && <p className="erro" role="alert">{erroLocalizacao}</p>}
          <small>A localização só é guardada quando autorizares o navegador. Também podes informar apenas o endereço.</small>
        </div>
      )}
      {os.modalidadeEntrega && (
        <p><small>Atual: {ROTULO_MODALIDADE[os.modalidadeEntrega]}
        {Number(os.taxaEntrega) > 0 && ` — ${fmtMoeda(os.taxaEntrega)}`}</small></p>
      )}
    </div>
  );
}

// ===================== PAGAMENTOS + RECIBO =====================
function PagamentosOS({ os, isStaff, aoMudar }) {
  const feedback = useFeedback();
  const [pagamentos, setPagamentos] = useState([]);
  const [valorPresencial, setValorPresencial] = useState('');
  const [metodoDigital, setMetodoDigital] = useState('MPESA');
  const [recibo, setRecibo] = useState(null);
  const [erro, setErro] = useState('');
  const ocupado = feedback.aExecutando;

  async function carregar() { setPagamentos(await api('GET', `/ordens/${os.id}/pagamentos`)); }
  useEffect(() => { carregar().catch(() => {}); }, [os.id]);

  const elegivel = os.estado === 'CONCLUIDA';
  const jaPaga = os.estado === 'PAGA' || os.estado === 'ENTREGUE';

  async function pagarDigital() {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/pagamentos`, { body: { metodo: metodoDigital, idempotencyKey: novaChave() } }),
      { sucesso: 'Pagamento iniciado', sucessoDetalhe: 'A aguardar confirmação…', carregando: 'A processar pagamento…' },
    );
    if (r.ok) { await carregar(); }
  }

  async function simularWebhook(pagamento, resultado) {
    const r = await feedback.executar(
      () => fetch(`${API_BASE}/webhooks/pagamentos/fake`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenciaInterna: pagamento.referenciaInterna, resultado, idEvento: novaChave() }),
      }).then((res) => res.json()),
      { sucesso: resultado === 'sucesso' ? 'Pagamento confirmado' : 'Pagamento recusado', carregando: 'A simular webhook…' },
    );
    if (r.ok) { await carregar(); aoMudar?.(); }
  }

  async function registarPresencial() {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/pagamentos`, { body: { metodo: 'PRESENCIAL', valor: valorPresencial, idempotencyKey: novaChave() } }),
      { sucesso: 'Pagamento presencial registado', sucessoDetalhe: 'Recibo emitido.', carregando: 'A registar…' },
    );
    if (r.ok) { setValorPresencial(''); await carregar(); aoMudar?.(); }
  }

  async function verRecibo(pagamentoId) {
    setErro('');
    try { setRecibo(await api('GET', `/pagamentos/${pagamentoId}/recibo`)); }
    catch (err) { setRecibo(null); setErro(err.message); }
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3>Pagamentos</h3>
      {elegivel && !jaPaga && (
        <>
          {!isStaff && (
            <div className="pagamento-cliente">
              <p>Total a pagar: <strong>{fmtMoeda(os.valorTotal)}</strong></p>
              <fieldset className="pagamento-metodos" disabled={ocupado}>
                <legend>Escolhe o método de pagamento</legend>
                {[
                  ['MPESA', 'M-Pesa'],
                  ['EMOLA', 'e-Mola'],
                  ['MKESH', 'mKesh'],
                  ['CONTA_BANCARIA', 'Conta bancária'],
                ].map(([metodo, nome]) => (
                  <label className={`pagamento-metodo${metodoDigital === metodo ? ' selecionado' : ''}`} key={metodo}>
                    <input
                      type="radio"
                      name={`metodo-pagamento-${os.id}`}
                      value={metodo}
                      checked={metodoDigital === metodo}
                      onChange={() => setMetodoDigital(metodo)}
                    />
                    <span>{nome}</span>
                  </label>
                ))}
              </fieldset>
              <button className="botao" onClick={pagarDigital} disabled={ocupado} aria-busy={ocupado}>
                Simular pagamento
              </button>
              <small className="pagamento-aviso">Simulação local: nenhuma API bancária é chamada e nenhum valor será debitado.</small>
            </div>
          )}
          {isStaff && (
            <div className="linha-row" style={{ marginBottom: 12 }}>
              <input type="number" min="0" step="0.01" placeholder={`Valor recebido (${os.valorTotal})`} value={valorPresencial} onChange={(e) => setValorPresencial(e.target.value)} disabled={ocupado} />
              <button className="botao" onClick={registarPresencial} disabled={!valorPresencial || ocupado} aria-busy={ocupado}>Registar pagamento presencial</button>
            </div>
          )}
        </>
      )}
      {jaPaga && <p className="info">OS liquidada.</p>}
      {pagamentos.length > 0 && (
        <table className="tabela">
          <thead><tr><th>Referência</th><th>Método</th><th>Valor</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {pagamentos.map((p) => (
              <tr key={p.id}>
                <td><small>{p.referenciaInterna}</small></td>
                <td>{ROTULO_METODO[p.metodo] ?? p.metodo}</td>
                <td>{fmtMoeda(p.valor)}</td>
                <td>{ROTULO_PAG_ESTADO[p.estado] ?? p.estado}</td>
                <td>
                  {p.estado === 'CONFIRMADO' && <button className="botao botao-secundario" onClick={() => verRecibo(p.id)}>Recibo</button>}
                  {p.estado === 'PENDENTE' && (
                    <>
                      <button className="botao botao-secundario" onClick={() => simularWebhook(p, 'sucesso')} disabled={ocupado} aria-busy={ocupado}><IconCheck /> simular ok</button>{' '}
                      <button className="botao botao-perigo" onClick={() => simularWebhook(p, 'falha')} disabled={ocupado} aria-busy={ocupado}><IconX /> simular falha</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {recibo && (
        <div className="cartao recibo print-documento" style={{ marginTop: 12 }}>
          <div className="recibo-cabecalho">
            <div>
              <span>Oficina John e Filhos</span>
              <h3>Comprovativo de pagamento</h3>
            </div>
            <strong>Recibo {recibo.numero}</strong>
          </div>
          <p><small>Emitido em {fmtData(recibo.emitidoAt)} · OS {recibo.snapshot.numeroOS} · {ROTULO_METODO[recibo.snapshot.metodo]}</small></p>
          <p>Referência do pagamento: <small>{recibo.snapshot.referenciaPagamento}</small></p>
          {(recibo.snapshot.linhas?.servicos?.length > 0 || recibo.snapshot.linhas?.pecas?.length > 0) && (
            <table className="tabela" style={{ marginTop: 8 }}>
              <thead><tr><th>Descrição</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {(recibo.snapshot.linhas?.servicos ?? []).map((l) => (<tr key={`rs${l.id}`}><td>{nomeItem(l, 'Serviço')}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>))}
                {(recibo.snapshot.linhas?.pecas ?? []).map((l) => (<tr key={`rp${l.id}`}><td>{nomeItem(l, 'Peça')}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>))}
              </tbody>
            </table>
          )}
          <p className="recibo-total"><strong>Total: {fmtMoeda(recibo.snapshot.totalOS)}</strong></p>
          <p className="recibo-aviso">Comprovativo interno de pagamento. Não substitui fatura ou documento fiscal.</p>
          <button type="button" className="botao botao-secundario print-hide" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      )}
    </div>
  );
}
