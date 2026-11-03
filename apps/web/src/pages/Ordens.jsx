import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const ROTULO_ESTADO = {
  PENDENTE: 'Pendente',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_APROVACAO_ORCAMENTO: 'Aguard. aprovação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'Aguard. peças',
  CONCLUIDA: 'Concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

const ACOES_POR_ESTADO = {
  PENDENTE: ['iniciar_diagnostico', 'cancelar'],
  EM_DIAGNOSTICO: ['aguardar_aprovacao', 'iniciar_reparacao', 'cancelar'],
  AGUARDANDO_APROVACAO_ORCAMENTO: ['iniciar_reparacao', 'iniciar_diagnostico', 'cancelar'],
  EM_REPARACAO: ['aguardar_pecas', 'concluir', 'cancelar'],
  AGUARDANDO_PECAS: ['iniciar_reparacao', 'cancelar'],
  CONCLUIDA: [],
  PAGA: ['entregar'], // NOVO: Staff pode confirmar entrega
  ENTREGUE: [],
  CANCELADA: [],
};

const ESTADOS_EDITAVEIS = ['PENDENTE', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO_ORCAMENTO', 'EM_REPARACAO', 'AGUARDANDO_PECAS'];

const ROTULO_ACAO = {
  iniciar_diagnostico: 'Iniciar diagnóstico',
  aguardar_aprovacao: 'Aguardar aprovação',
  iniciar_reparacao: 'Iniciar reparação',
  aguardar_pecas: 'Aguardar peças',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
  entregar: 'Confirmar entrega', // NOVO
};

const ROTULO_METODO = { PRESENCIAL: 'Presencial', CARTAO: 'Cartão', MOBILE_MONEY: 'Mobile Money' };
const ROTULO_PAG_ESTADO = { PENDENTE: 'A aguardar', CONFIRMADO: 'Pago', RECUSADO: 'Recusado', CANCELADO: 'Cancelado' };
const ROTULO_MODALIDADE = { LEVANTAMENTO: 'Levantamento na oficina (Grátis)', DOMICILIO: 'Entrega ao domicílio (+500.00 MZN)' };

const fmtData = (iso) => (iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—');
const fmtHora = (iso) => new Date(iso).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' });
const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;
const novaChave = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

export default function Ordens({ perfil }) {
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil);
  return isStaff ? <VistaStaff /> : <VistaCliente />;
}

// ===================== CLIENTE =====================
function VistaCliente() {
  const [lista, setLista] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    setLista(await api('GET', '/ordens/meu'));
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
    } catch (err) {
      setErro(err.message);
    }
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
          <thead>
            <tr><th>Número</th><th>Estado</th><th>Total</th><th>Criada em</th><th></th></tr>
          </thead>
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
          {ESTADOS_EDITAVEIS.includes(detalhe.os.estado) && (
            <EntregaOS os={detalhe.os} aoMudar={() => abrir(detalhe.os.id)} />
          )}
          <PagamentosOS os={detalhe.os} isStaff={false} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          {detalhe.os.estado === 'ENTREGUE' && <AvaliarOS os={detalhe.os} />}
          <ChatOrdem ordemId={detalhe.os.id} />
        </>
      )}
    </section>
  );
}

// ===================== STAFF =====================
function VistaStaff() {
  const [lista, setLista] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [veiculosCliente, setVeiculosCliente] = useState([]);
  const [veiculoId, setVeiculoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [msg, setMsg] = useState('');
  const [catalogo, setCatalogo] = useState([]);
  const [servicoId, setServicoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  async function carregar() {
    setLista(await api('GET', '/ordens'));
    setCatalogo((await api('GET', '/servicos/todos')).filter((s) => s.ativo));
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
    } catch (err) {
      setErro(err.message);
    }
  }

  async function carregarVeiculosDoCliente() {
    setErro(''); setVeiculoId('');
    try {
      const vs = await api('GET', `/clientes/${encodeURIComponent(emailCliente.trim())}/veiculos`);
      setVeiculosCliente(vs);
      if (vs.length > 0) setVeiculoId(vs[0].id);
    } catch (err) {
      setErro(err.message); setVeiculosCliente([]);
    }
  }

  async function criarOs(e) {
    e.preventDefault(); setErro(''); setMsg('');
    try {
      const criada = await api('POST', '/ordens', {
        body: { emailCliente: emailCliente.trim(), veiculoId: Number(veiculoId), descricaoProblema: descricao },
      });
      setDescricao(''); setMsg(`OS ${criada.numeroOS} criada.`);
      await carregar(); await abrir(criada.id);
    } catch (err) { setErro(err.message); }
  }

  async function executarAcao(acao) {
    setErro('');
    try {
      await api('POST', `/ordens/${detalhe.os.id}/transicoes`, {
        body: { acao, motivo: acao === 'cancelar' ? 'Cancelado pela oficina' : undefined },
      });
      await abrir(detalhe.os.id); await carregar();
    } catch (err) { setErro(err.message); }
  }

  async function lancarServico() {
    setErro('');
    try {
      await api('POST', `/ordens/${detalhe.os.id}/servicos`, {
        body: { servicoId: Number(servicoId), quantidade: Number(quantidade) },
      });
      await abrir(detalhe.os.id); await carregar();
    } catch (err) { setErro(err.message); }
  }

  if (lista === null) return <p className="centro">A carregar…</p>;
  const acoesDisponiveis = detalhe ? (ACOES_POR_ESTADO[detalhe.os.estado] ?? []) : [];

  return (
    <section>
      <h2>Nova ordem de serviço</h2>
      <form className="cartao form-servico" onSubmit={criarOs}>
        <label htmlFor="emailCliente">E-mail do cliente</label>
        <div className="linha-row">
          <input id="emailCliente" type="email" value={emailCliente} onChange={(e) => setEmailCliente(e.target.value)} required />
          <button type="button" className="botao botao-secundario" onClick={carregarVeiculosDoCliente}>Carregar veículos</button>
        </div>
        {veiculosCliente.length > 0 && (
          <>
            <label htmlFor="veiculoOs">Veículo do cliente</label>
            <select id="veiculoOs" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
              {veiculosCliente.map((v) => (<option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>))}
            </select>
          </>
        )}
        <label htmlFor="descricaoOs">Descrição do problema (mín. 10)</label>
        <textarea id="descricaoOs" rows="2" value={descricao} minLength={10} onChange={(e) => setDescricao(e.target.value)} required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        {msg && <p className="info">{msg}</p>}
        <button className="botao" type="submit" disabled={!veiculoId}>Criar OS</button>
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
          {acoesDisponiveis.length > 0 && (
            <div className="cartao" style={{ marginTop: 16 }}>
              <h3>Transições de estado</h3>
              {acoesDisponiveis.map((a) => (
                <button key={a} className={a === 'cancelar' ? 'botao botao-perigo' : 'botao'} style={{ marginRight: 8, marginTop: 4 }} onClick={() => executarAcao(a)}>
                  {ROTULO_ACAO[a]}
                </button>
              ))}
            </div>
          )}
          {ESTADOS_EDITAVEIS.includes(detalhe.os.estado) && (
            <div className="cartao" style={{ marginTop: 16 }}>
              <h3>Lançar serviço</h3>
              <div className="linha-row">
                <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                  <option value="">— escolher serviço —</option>
                  {catalogo.map((s) => (<option key={s.id} value={s.id}>{s.nome} ({fmtMoeda(s.precoBase)})</option>))}
                </select>
                <input type="number" min="1" className="input-pequeno" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
                <button className="botao" onClick={lancarServico} disabled={!servicoId}>Lançar</button>
              </div>
            </div>
          )}
          {ESTADOS_EDITAVEIS.includes(detalhe.os.estado) && <EntregaOS os={detalhe.os} aoMudar={() => abrir(detalhe.os.id)} />}
          <PagamentosOS os={detalhe.os} isStaff={true} aoMudar={() => { abrir(detalhe.os.id); carregar(); }} />
          <ChatOrdem ordemId={detalhe.os.id} />
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
      {os.dataConclusao && <p><small>Concluída em {fmtData(os.dataConclusao)}</small></p>}
      {(linhas.servicos.length > 0 || linhas.pecas.length > 0) && (
        <table className="tabela" style={{ marginTop: 8 }}>
          <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
          <tbody>
            {linhas.servicos.map((l) => (
              <tr key={`s${l.id}`}><td>Serviço</td><td>{l.descricao_snapshot}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>
            ))}
            {linhas.pecas.map((l) => (
              <tr key={`p${l.id}`}><td>Peça</td><td>#{l.peca_id}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <h4 style={{ marginTop: 16 }}>Histórico</h4>
      <ul className="historico">
        {historico.map((h) => (
          <li key={h.id}>
            <small>{fmtData(h.ocorridoAt)}</small> —{' '}
            {h.estadoAnterior ?? '∅'} → <strong>{ROTULO_ESTADO[h.estadoNovo] ?? h.estadoNovo}</strong>
            {h.motivo && <em> ({h.motivo})</em>}
          </li>
        ))}
      </ul>
      {!mostrarAcoes && <p className="vazio"><small>Acompanhe o estado da sua reparação aqui.</small></p>}
    </div>
  );
}

// ===================== ENTREGA (RF07) =====================
function EntregaOS({ os, aoMudar }) {
  const [modalidade, setModalidade] = useState(os.modalidadeEntrega ?? 'LEVANTAMENTO');
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');

  async function guardar() {
    setErro(''); setInfo('');
    try {
      await api('POST', `/ordens/${os.id}/entrega`, { body: { modalidade } });
      setInfo('Modalidade de entrega guardada. O total foi atualizado.');
      aoMudar();
    } catch (err) { setErro(err.message); }
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3>Modalidade de entrega</h3>
      <div className="linha-row">
        <select value={modalidade} onChange={(e) => setModalidade(e.target.value)}>
          <option value="LEVANTAMENTO">Levantamento na oficina (Grátis)</option>
          <option value="DOMICILIO">Entrega ao domicílio (+500.00 MZN)</option>
        </select>
        <button className="botao botao-secundario" onClick={guardar}>Guardar</button>
      </div>
      {os.modalidadeEntrega && (
        <p><small>Atual: {ROTULO_MODALIDADE[os.modalidadeEntrega]}
        {Number(os.taxaEntrega) > 0 && ` — ${fmtMoeda(os.taxaEntrega)}`}</small></p>
      )}
      {info && <p className="info">{info}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}

// ===================== PAGAMENTOS + RECIBO =====================
function PagamentosOS({ os, isStaff, aoMudar }) {
  const [pagamentos, setPagamentos] = useState([]);
  const [valorPresencial, setValorPresencial] = useState('');
  const [recibo, setRecibo] = useState(null);
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');
  const [aProcessar, setAProcessar] = useState(false);

  async function carregar() { setPagamentos(await api('GET', `/ordens/${os.id}/pagamentos`)); }
  useEffect(() => { carregar().catch(() => {}); }, [os.id]);

  const elegivel = os.estado === 'CONCLUIDA';
  const jaPaga = os.estado === 'PAGA' || os.estado === 'ENTREGUE';

  async function pagarDigital() {
    setErro(''); setInfo(''); setAProcessar(true);
    try {
      const p = await api('POST', `/ordens/${os.id}/pagamentos`, { body: { metodo: 'MOBILE_MONEY', idempotencyKey: novaChave() } });
      setInfo(`Pagamento ${p.referenciaInterna} iniciado. A aguardar confirmação…`);
      await carregar();
    } catch (err) { setErro(err.message); } finally { setAProcessar(false); }
  }

  async function simularWebhook(pagamento, resultado) {
    setErro('');
    try {
      const r = await fetch(`${import.meta.env.VITE_API_BASE_URL}/webhooks/pagamentos/fake`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenciaInterna: pagamento.referenciaInterna, resultado, idEvento: novaChave() }),
      });
      const json = await r.json();
      setInfo(json.data.duplicado ? 'Evento duplicado ignorado.' : `Resultado: ${json.data.estado ?? 'sem efeito'}`);
      await carregar(); aoMudar();
    } catch { setErro('Falha na simulação do webhook.'); }
  }

  async function registarPresencial() {
    setErro(''); setInfo('');
    try {
      await api('POST', `/ordens/${os.id}/pagamentos`, { body: { metodo: 'PRESENCIAL', valor: valorPresencial, idempotencyKey: novaChave() } });
      setValorPresencial(''); setInfo('Pagamento presencial registado com recibo emitido.');
      await carregar(); aoMudar();
    } catch (err) { setErro(err.message); }
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
            <div className="linha-row" style={{ marginBottom: 12 }}>
              <span>Total a pagar: <strong>{fmtMoeda(os.valorTotal)}</strong></span>
              <button className="botao" onClick={pagarDigital} disabled={aProcessar}>{aProcessar ? 'A processar…' : 'Pagar com Mobile Money'}</button>
            </div>
          )}
          {isStaff && (
            <div className="linha-row" style={{ marginBottom: 12 }}>
              <input type="number" min="0" step="0.01" placeholder={`Valor recebido (${os.valorTotal})`} value={valorPresencial} onChange={(e) => setValorPresencial(e.target.value)} />
              <button className="botao" onClick={registarPresencial} disabled={!valorPresencial}>Registar pagamento presencial</button>
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
                      <button className="botao botao-secundario" onClick={() => simularWebhook(p, 'sucesso')}>✓ simular ok</button>{' '}
                      <button className="botao botao-perigo" onClick={() => simularWebhook(p, 'falha')}>✗ simular falha</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {info && <p className="info">{info}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {recibo && (
        <div className="cartao recibo" style={{ marginTop: 12 }}>
          <div className="orcamento-cabecalho"><strong>Recibo {recibo.numero}</strong><span className="orcamento-total">{fmtMoeda(recibo.snapshot.valor)}</span></div>
          <p><small>Emitido em {fmtData(recibo.emitidoAt)} · OS {recibo.snapshot.numeroOS} · {ROTULO_METODO[recibo.snapshot.metodo]}</small></p>
          <p>Referência do pagamento: <small>{recibo.snapshot.referenciaPagamento}</small></p>
          {(recibo.snapshot.linhas?.servicos?.length > 0 || recibo.snapshot.linhas?.pecas?.length > 0) && (
            <table className="tabela" style={{ marginTop: 8 }}>
              <thead><tr><th>Descrição</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr></thead>
              <tbody>
                {recibo.snapshot.linhas.servicos.map((l) => (<tr key={`rs${l.id}`}><td>{l.descricao_snapshot}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>))}
                {recibo.snapshot.linhas.pecas.map((l) => (<tr key={`rp${l.id}`}><td>Peça #{l.peca_id}</td><td>{l.quantidade}</td><td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td></tr>))}
              </tbody>
            </table>
          )}
          <p style={{ textAlign: 'right' }}><strong>Total: {fmtMoeda(recibo.snapshot.totalOS)}</strong></p>
        </div>
      )}
    </div>
  );
}

// ===================== AVALIAÇÃO (RF08) =====================
function AvaliarOS({ os }) {
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [estado, setEstado] = useState(''); // '' | 'ok' | 'ja-avaliada'
  const [erro, setErro] = useState('');

  async function submeter(e) {
    e.preventDefault();
    setErro('');
    try {
      await api('POST', `/ordens/${os.id}/avaliacoes`, { body: { classificacao: nota, comentario } });
      setEstado('ok');
    } catch (err) {
      if (err.message.includes('AVALIACAO_EXISTENTE') || err.code === 'AVALIACAO_EXISTENTE') setEstado('ja-avaliada');
      else setErro(err.message);
    }
  }

  if (estado === 'ok') return <p className="info" style={{ marginTop: 16 }}>Obrigado pela sua avaliação!</p>;
  if (estado === 'ja-avaliada') return <p className="vazio" style={{ marginTop: 16 }}>Já avaliou esta ordem de serviço.</p>;

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3>Avaliar o serviço</h3>
      <form className="form-servico" onSubmit={submeter}>
        <div className="estrelas-input" role="radiogroup" aria-label="Classificação de 1 a 5 estrelas">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={`estrela ${n <= nota ? 'ativa' : ''}`} onClick={() => setNota(n)} aria-label={`${n} estrelas`}>
              {n <= nota ? '★' : '☆'}
            </button>
          ))}
        </div>
        <label htmlFor="comentario">Comentário (opcional)</label>
        <textarea id="comentario" rows="3" maxLength={1000} value={comentario} onChange={(e) => setComentario(e.target.value)} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit">Enviar avaliação</button>
      </form>
    </div>
  );
}

// ===================== CHAT =====================
function ChatOrdem({ ordemId }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const containerRef = useRef(null);

  async function carregar() {
    try { setMensagens(await api('GET', `/ordens/${ordemId}/mensagens`)); } catch {}
  }
  useEffect(() => { carregar(); const timer = setInterval(carregar, 5000); return () => clearInterval(timer); }, [ordemId]);
  useEffect(() => {
    const caixa = containerRef.current;
    if (!caixa) return;
    const distanciaDoFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight;
    if (distanciaDoFim < 80) caixa.scrollTop = caixa.scrollHeight;
  }, [mensagens]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro('');
    try {
      await api('POST', `/ordens/${ordemId}/mensagens`, { body: { conteudo: texto } });
      setTexto(''); await carregar();
    } catch (err) { setErro(err.message); }
  }

  return (
    <div className="cartao chat" style={{ marginTop: 16 }}>
      <h3>Conversa com a oficina</h3>
      <div className="chat-mensagens" ref={containerRef}>
        {mensagens.length === 0 && <p className="vazio">Ainda sem mensagens. Escreva abaixo.</p>}
        {mensagens.map((m) => (
          <div key={m.id} className={`chat-linha ${m.remetentePerfil === 'CLIENTE' ? 'chat-cliente' : 'chat-staff'}`}>
            <div className="chat-bolha">
              <small>{m.remetenteNome} · {fmtHora(m.enviadoAt)}</small>
              <p>{m.conteudo}</p>
            </div>
          </div>
        ))}
      </div>
      <form className="linha-row" onSubmit={enviar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva a sua mensagem…" maxLength={2000} />
        <button className="botao" type="submit">Enviar</button>
      </form>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}