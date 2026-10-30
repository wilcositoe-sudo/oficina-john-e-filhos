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
  PAGA: [],
  ENTREGUE: [],
  CANCELADA: [],
};

const ROTULO_ACAO = {
  iniciar_diagnostico: 'Iniciar diagnóstico',
  aguardar_aprovacao: 'Aguardar aprovação',
  iniciar_reparacao: 'Iniciar reparação',
  aguardar_pecas: 'Aguardar peças',
  concluir: 'Concluir',
  cancelar: 'Cancelar',
};

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—';
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' });
const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;

export default function Ordens({ perfil }) {
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil);
  return isStaff ? <VistaStaff /> : <VistaCliente />;
}

// ===================== CLIENTE (UI09/UI10) =====================
function VistaCliente() {
  const [lista, setLista] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    setLista(await api('GET', '/ordens/meu'));
  }
  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, []);

  async function abrir(id) {
    setErro('');
    setSelecionada(id);
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

  if (lista === null) return <p>A carregar…</p>;

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
          <ChatOrdem ordemId={detalhe.os.id} />
        </>
      )}
    </section>
  );
}

// ===================== STAFF (UI16/UI17) =====================
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
    setErro('');
    setVeiculoId('');
    try {
      const vs = await api('GET', `/clientes/${encodeURIComponent(emailCliente.trim())}/veiculos`);
      setVeiculosCliente(vs);
      if (vs.length > 0) setVeiculoId(vs[0].id);
    } catch (err) {
      setErro(err.message);
      setVeiculosCliente([]);
    }
  }

  async function criarOs(e) {
    e.preventDefault();
    setErro('');
    setMsg('');
    try {
      const criada = await api('POST', '/ordens', {
        body: { emailCliente: emailCliente.trim(), veiculoId: Number(veiculoId), descricaoProblema: descricao },
      });
      setDescricao('');
      setMsg(`OS ${criada.numeroOS} criada.`);
      await carregar();
      await abrir(criada.id);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function executarAcao(acao) {
    setErro('');
    try {
      await api('POST', `/ordens/${detalhe.os.id}/transicoes`, {
        body: { acao, motivo: acao === 'cancelar' ? 'Cancelado pela oficina' : undefined },
      });
      await abrir(detalhe.os.id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function lancarServico() {
    setErro('');
    try {
      await api('POST', `/ordens/${detalhe.os.id}/servicos`, {
        body: { servicoId: Number(servicoId), quantidade: Number(quantidade) },
      });
      await abrir(detalhe.os.id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (lista === null) return <p>A carregar…</p>;

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
              {veiculosCliente.map((v) => (
                <option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>
              ))}
            </select>
          </>
        )}
        <label htmlFor="descricaoOs">Descrição do problema (mín. 10)</label>
        <textarea id="descricaoOs" rows="2" value={descricao} minLength={10}
          onChange={(e) => setDescricao(e.target.value)} required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        {msg && <p className="info">{msg}</p>}
        <button className="botao" type="submit" disabled={!veiculoId}>Criar OS</button>
      </form>

      <h2>Todas as ordens de serviço</h2>
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
                <button key={a} className={a === 'cancelar' ? 'botao botao-perigo' : 'botao'}
                  style={{ marginRight: 8, marginTop: 4 }}
                  onClick={() => executarAcao(a)}>
                  {ROTULO_ACAO[a]}
                </button>
              ))}
            </div>
          )}
          {['PENDENTE', 'EM_DIAGNOSTICO', 'AGUARDANDO_APROVACAO_ORCAMENTO', 'EM_REPARACAO', 'AGUARDANDO_PECAS'].includes(detalhe.os.estado) && (
            <div className="cartao" style={{ marginTop: 16 }}>
              <h3>Lançar serviço</h3>
              <div className="linha-row">
                <select value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                  <option value="">— escolher serviço —</option>
                  {catalogo.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome} ({fmtMoeda(s.precoBase)})</option>
                  ))}
                </select>
                <input type="number" min="1" className="input-pequeno" value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)} />
                <button className="botao" onClick={lancarServico} disabled={!servicoId}>Lançar</button>
              </div>
            </div>
          )}
          <ChatOrdem ordemId={detalhe.os.id} />
        </>
      )}
    </section>
  );
}

// ===================== PAINEL DE DETALHE PARTILHADO =====================
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
      {os.dataConclusao && <p><small>Concluída em {fmtData(os.dataConclusao)}</small></p>}

      {(linhas.servicos.length > 0 || linhas.pecas.length > 0) && (
        <table className="tabela" style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th></tr>
          </thead>
          <tbody>
            {linhas.servicos.map((l) => (
              <tr key={`s${l.id}`}>
                <td>Serviço</td><td>{l.descricao_snapshot}</td><td>{l.quantidade}</td>
                <td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td>
              </tr>
            ))}
            {linhas.pecas.map((l) => (
              <tr key={`p${l.id}`}>
                <td>Peça</td><td>#{l.peca_id}</td><td>{l.quantidade}</td>
                <td>{fmtMoeda(l.preco_unitario)}</td><td>{fmtMoeda(l.subtotal)}</td>
              </tr>
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

// ===================== CHAT DA OS (RF05/RF10 — polling 5s, DEC-P09) =====================
function ChatOrdem({ ordemId }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const fimRef = useRef(null);

  async function carregar() {
    try {
      setMensagens(await api('GET', `/ordens/${ordemId}/mensagens`));
    } catch {
      /* mantém mensagens em memória se a rede falhar */
    }
  }

  useEffect(() => {
    carregar();
    const timer = setInterval(carregar, 5000); // polling simples — SSE/WebSocket fica para evolução
    return () => clearInterval(timer);
  }, [ordemId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro('');
    try {
      await api('POST', `/ordens/${ordemId}/mensagens`, { body: { conteudo: texto } });
      setTexto('');
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="cartao chat" style={{ marginTop: 16 }}>
      <h3>Conversa com a oficina</h3>
      <div className="chat-mensagens">
        {mensagens.length === 0 && <p className="vazio">Ainda sem mensagens. Escreva abaixo.</p>}
        {mensagens.map((m) => (
          <div key={m.id} className={`chat-linha ${m.remetentePerfil === 'CLIENTE' ? 'chat-cliente' : 'chat-staff'}`}>
            <div className="chat-bolha">
              <small>{m.remetenteNome} · {fmtHora(m.enviadoAt)}</small>
              <p>{m.conteudo}</p>
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>
      <form className="linha-row" onSubmit={enviar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva a sua mensagem…" maxLength={2000} />
        <button className="botao" type="submit">Enviar</button>
      </form>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}