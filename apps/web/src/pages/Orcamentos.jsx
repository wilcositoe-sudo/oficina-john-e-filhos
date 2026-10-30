import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ROTULO_ESTADO = {
  SOLICITADO: 'Solicitado',
  ENVIADO: 'Proposta enviada',
  APROVADO: 'Aprovado',
  REJEITADO: 'Rejeitado',
  EXPIRADO: 'Expirado',
  CONVERTIDO: 'Convertido em OS',
};

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—';
const fmtMoeda = (v) => (v !== null && v !== undefined ? `${Number(v).toFixed(2)} MZN` : '—');

export default function Orcamentos({ perfil }) {
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(perfil);
  return isStaff ? <VistaStaff /> : <VistaCliente />;
}

// ---------- CLIENTE (UI07): pedir + acompanhar + decidir ----------
function VistaCliente() {
  const [veiculos, setVeiculos] = useState([]);
  const [orcamentos, setOrcamentos] = useState(null);
  const [veiculoId, setVeiculoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const [v, o] = await Promise.all([api('GET', '/veiculos'), api('GET', '/orcamentos/meu')]);
    setVeiculos(v);
    setOrcamentos(o);
    if (!veiculoId && v.length > 0) setVeiculoId(v[0].id);
  }
  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, []);

  async function pedir(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await api('POST', '/orcamentos', { body: { veiculoId: Number(veiculoId), descricaoProblema: descricao } });
      setDescricao('');
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function decidir(id, decisao) {
    try {
      await api('POST', `/orcamentos/${id}/decisao`, { body: { decisao } });
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (orcamentos === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Pedir orçamento</h2>
      <form className="cartao form-servico" onSubmit={pedir}>
        <label htmlFor="veiculo">Veículo</label>
        <select id="veiculo" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)} required>
          {veiculos.length === 0 && <option value="">— registe um veículo primeiro —</option>}
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>
          ))}
        </select>
        <label htmlFor="descricao">Descreva o problema (mín. 10 caracteres)</label>
        <textarea id="descricao" rows="3" value={descricao} minLength={10}
          onChange={(e) => setDescricao(e.target.value)} required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit" disabled={loading || veiculos.length === 0}>
          {loading ? 'A enviar…' : 'Pedir orçamento'}
        </button>
      </form>

      <h2>Os meus orçamentos</h2>
      {orcamentos.length === 0 ? (
        <p className="vazio">Ainda não pediu nenhum orçamento.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Número</th><th>Estado</th><th>Total estimado</th><th>Pedido em</th><th></th></tr>
          </thead>
          <tbody>
            {orcamentos.map((o) => (
              <tr key={o.id}>
                <td>{o.numero}</td>
                <td>{ROTULO_ESTADO[o.estado] ?? o.estado}</td>
                <td>{fmtMoeda(o.totalEstimado)}</td>
                <td>{fmtData(o.createdAt)}</td>
                <td>
                  {o.estado === 'ENVIADO' && (
                    <>
                      <button className="botao botao-secundario" onClick={() => decidir(o.id, 'APROVAR')}>Aprovar</button>{' '}
                      <button className="botao botao-perigo" onClick={() => decidir(o.id, 'REJEITAR')}>Rejeitar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ---------- STAFF (UI15): fila + responder com proposta ----------
function VistaStaff() {
  const [orcamentos, setOrcamentos] = useState(null);
  const [aResponder, setAResponder] = useState(null); // id do orçamento em edição
  const [linhas, setLinhas] = useState([{ descricao: '', quantidade: 1, precoUnitario: '' }]);
  const [erro, setErro] = useState('');

  async function carregar() {
    setOrcamentos(await api('GET', '/orcamentos'));
  }
  useEffect(() => { carregar().catch((e) => setErro(e.message)); }, []);

  function alterarLinha(idx, campo, valor) {
    setLinhas((ls) => ls.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  }

  async function enviarProposta(id) {
    setErro('');
    try {
      await api('POST', `/orcamentos/${id}/resposta`, {
        body: { itens: linhas.map((l) => ({ ...l, quantidade: Number(l.quantidade) })) },
      });
      setAResponder(null);
      setLinhas([{ descricao: '', quantidade: 1, precoUnitario: '' }]);
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  if (orcamentos === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Fila de orçamentos</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {orcamentos.length === 0 ? (
        <p className="vazio">Sem pedidos de orçamento.</p>
      ) : (
        orcamentos.map((o) => (
          <article className="cartao orcamento-item" key={o.id}>
            <div className="orcamento-cabecalho">
              <strong>{o.numero}</strong>
              <span className={`badge badge-${o.estado.toLowerCase()}`}>{ROTULO_ESTADO[o.estado] ?? o.estado}</span>
              <span className="orcamento-total">{fmtMoeda(o.totalEstimado)}</span>
            </div>
            <p>{o.descricaoProblema}</p>

            {o.estado === 'SOLICITADO' && aResponder !== o.id && (
              <button className="botao botao-secundario" onClick={() => setAResponder(o.id)}>
                Responder proposta
              </button>
            )}

            {aResponder === o.id && (
              <div className="proposta">
                {linhas.map((l, idx) => (
                  <div className="linha-row" key={idx}>
                    <input placeholder="Descrição (ex.: Pastilhas)" value={l.descricao}
                      onChange={(e) => alterarLinha(idx, 'descricao', e.target.value)} />
                    <input type="number" min="1" className="input-pequeno" value={l.quantidade}
                      onChange={(e) => alterarLinha(idx, 'quantidade', e.target.value)} />
                    <input type="number" min="0" step="0.01" placeholder="Preço" value={l.precoUnitario}
                      onChange={(e) => alterarLinha(idx, 'precoUnitario', e.target.value)} />
                    {linhas.length > 1 && (
                      <button type="button" className="ligacao" onClick={() => setLinhas((ls) => ls.filter((_, i) => i !== idx))}>
                        remover
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="ligacao" onClick={() => setLinhas((ls) => [...ls, { descricao: '', quantidade: 1, precoUnitario: '' }])}>
                  + adicionar linha
                </button>
                <div>
                  <button className="botao" onClick={() => enviarProposta(o.id)}>Enviar proposta</button>{' '}
                  <button className="botao botao-secundario" onClick={() => setAResponder(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </section>
  );
}