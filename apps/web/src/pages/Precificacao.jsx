import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;

const ESTADOS_ALVO = ['AGUARDANDO_PRECO_FUNCIONARIO', 'AGUARDANDO_VALIDACAO_FUNCIONARIO'];

export default function Precificacao() {
  const [lista, setLista] = useState(null);
  const [osAberta, setOsAberta] = useState(null);
  const [erro, setErro] = useState('');

  async function carregar() {
    try {
      const todas = await api('GET', '/ordens');
      setLista(todas.filter((o) => ESTADOS_ALVO.includes(o.estado)));
      setErro('');
    } catch (e) { setErro(e.message); }
  }
  useEffect(() => { carregar(); }, []);

  async function abrir(id) {
    setErro('');
    try {
      const [os, linhas] = await Promise.all([
        api('GET', `/ordens/${id}`),
        api('GET', `/ordens/${id}/linhas`),
      ]);
      setOsAberta({ os, linhas });
    } catch (e) { setErro(e.message); }
  }

  if (lista === null) return <p className="centro">A carregar…</p>;

  return (
    <section>
      <h2>💰 Precificação e Validação</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {osAberta ? (
        <PainelPrecificacao
          os={osAberta.os}
          linhas={osAberta.linhas}
          aoVoltar={() => setOsAberta(null)}
          aoMudar={carregar}
        />
      ) : lista.length === 0 ? (
        <p className="vazio">Nenhuma OS aguarda precificação ou validação de cortes.</p>
      ) : (
        <table className="tabela">
          <thead><tr><th>Número</th><th>Estado</th><th>Problema</th><th></th></tr></thead>
          <tbody>
            {lista.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.numeroOS}</strong></td>
                <td>
                  <span className={`badge badge-${o.estado.toLowerCase()}`}>
                    {o.estado === 'AGUARDANDO_PRECO_FUNCIONARIO' ? 'Aguarda preço' : 'Aguarda validação de cortes'}
                  </span>
                </td>
                <td>{o.descricaoProblema?.slice(0, 60)}{o.descricaoProblema?.length > 60 ? '…' : ''}</td>
                <td><button className="botao" onClick={() => abrir(o.id)}>Abrir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function PainelPrecificacao({ os, linhas, aoVoltar, aoMudar }) {
  const ehPrecificacao = os.estado === 'AGUARDANDO_PRECO_FUNCIONARIO';
  const [precos, setPrecos] = useState({}); // { [linhaId]: valor }
  const [taxa, setTaxa] = useState(os.taxaDiagnostico ?? '0');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function enviarOrcamento(e) {
    e.preventDefault();
    setErro(''); setMsg(''); setLoading(true);
    try {
      const precosPayload = [
        ...linhas.servicos.map((s) => ({ tipo: 'servico', linhaId: s.id, preco: Number(precos[s.id] ?? s.preco_unitario) })),
        ...linhas.pecas.map((p) => ({ tipo: 'peca', linhaId: p.id, preco: Number(precos[p.id] ?? p.preco_unitario) })),
      ];
      await api('POST', `/ordens/${os.id}/precificar`, {
        body: { taxaDiagnostico: Number(taxa), precos: precosPayload },
      });
      setMsg('Orçamento enviado ao cliente.');
      aoMudar();
      setTimeout(aoVoltar, 1200);
    } catch (err) { setErro(err.message); }
    finally { setLoading(false); }
  }

  async function validarCortes(aprovada) {
    setErro(''); setMsg(''); setLoading(true);
    try {
      await api('POST', `/ordens/${os.id}/validar-revisao`, { body: { aprovada } });
      setMsg(aprovada ? 'Cortes aprovados. Mecânico notificado.' : 'Cortes recusados. Cliente notificado.');
      aoMudar();
      setTimeout(aoVoltar, 1200);
    } catch (err) { setErro(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>{os.numeroOS} — {ehPrecificacao ? 'Precificar diagnóstico' : 'Validar cortes do cliente'}</h3>
        <button className="botao botao-secundario" onClick={aoVoltar}>← Voltar</button>
      </div>
      <p><small>{os.descricaoProblema}</small></p>

      {/* Linhas lançadas pelo mecânico (sem preço) */}
      <table className="tabela" style={{ marginTop: 12 }}>
        <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Preço unit.</th><th>Subtotal</th></tr></thead>
        <tbody>
          {linhas.servicos.map((s) => (
            <tr key={`s${s.id}`}>
              <td>Serviço</td>
              <td>{s.descricao_snapshot}</td>
              <td>{s.quantidade}</td>
              <td>
                {ehPrecificacao ? (
                  <input
                    type="number" min="0" step="0.01" style={{ width: 110 }}
                    defaultValue={Number(s.preco_unitario) || ''}
                    onChange={(e) => setPrecos({ ...precos, [s.id]: e.target.value })}
                    placeholder="0.00"
                  />
                ) : fmtMoeda(s.preco_unitario)}
              </td>
              <td>{fmtMoeda((Number(precos[s.id] ?? s.preco_unitario) || 0) * s.quantidade)}</td>
            </tr>
          ))}
          {linhas.pecas.map((p) => (
            <tr key={`p${p.id}`}>
              <td>Peça</td>
              <td>Peça #{p.peca_id}</td>
              <td>{p.quantidade}</td>
              <td>
                {ehPrecificacao ? (
                  <input
                    type="number" min="0" step="0.01" style={{ width: 110 }}
                    defaultValue={Number(p.preco_unitario) || ''}
                    onChange={(e) => setPrecos({ ...precos, [p.id]: e.target.value })}
                    placeholder="0.00"
                  />
                ) : fmtMoeda(p.preco_unitario)}
              </td>
              <td>{fmtMoeda((Number(precos[p.id] ?? p.preco_unitario) || 0) * p.quantidade)}</td>
            </tr>
          ))}
          {linhas.servicos.length === 0 && linhas.pecas.length === 0 && (
            <tr><td colSpan="5" className="vazio">O mecânico não lançou serviços/peças.</td></tr>
          )}
        </tbody>
      </table>

      {ehPrecificacao && (
        <div style={{ marginTop: 12 }}>
          <label>Taxa de diagnóstico (cobrada se o cliente rejeitar)</label>
          <input type="number" min="0" step="0.01" style={{ width: 140 }} value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
      )}

      {erro && <p className="erro" role="alert" style={{ marginTop: 12 }}>{erro}</p>}
      {msg && <p className="info" style={{ marginTop: 12 }}>{msg}</p>}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        {ehPrecificacao ? (
          <button className="botao" onClick={enviarOrcamento} disabled={loading}>
            {loading ? 'A enviar…' : '✅ Enviar Orçamento ao Cliente'}
          </button>
        ) : (
          <>
            <button className="botao" onClick={() => validarCortes(true)} disabled={loading}>Aprovar cortes</button>
            <button className="botao botao-perigo" onClick={() => validarCortes(false)} disabled={loading}>Recusar cortes</button>
          </>
        )}
      </div>
    </div>
  );
}