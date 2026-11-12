import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from './Feedback.jsx';
import {
  IconCheck,
  IconX,
  IconArrowLeft,
  IconSearch,
  IconClipboard,
  IconCreditCard,
  IconeEstadoCheck,
} from './icons.jsx';

const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;

const ROTULO_ESTADO_CHECK = {
  OK: 'OK',
  DESGASTE: 'Desgaste',
  AVARIADO: 'Avariado',
  SUBSTITUIR: 'Substituir',
};

function ChecklistDiagnostico({ ordemId }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    api('GET', `/ordens/${ordemId}/checklist`)
      .then((r) => { if (vivo) setItens(Array.isArray(r) ? r : []); })
      .catch((e) => { if (vivo) setErro(e.message); });
    return () => { vivo = false; };
  }, [ordemId]);

  if (erro) return <p className="erro" role="alert">Diagnóstico indisponível: {erro}</p>;
  if (itens === null) return <p className="vazio">A carregar diagnóstico…</p>;
  if (itens.length === 0) return <p className="vazio">O mecânico não preencheu checklist técnico.</p>;

  return (
    <div className="cartao" style={{ marginTop: 12, background: '#F3F7FA' }}>
      <h4><IconClipboard /> Diagnóstico técnico do mecânico</h4>
      <table className="tabela">
        <thead><tr><th>Componente</th><th>Estado</th><th>Observação</th><th>Medição</th></tr></thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id}>
              <td>{i.item}</td>
              <td>
                <span className="estado-check">
                  <IconeEstadoCheck valor={i.estado} />
                  {ROTULO_ESTADO_CHECK[i.estado] ?? i.estado}
                </span>
              </td>
              <td>{i.observacao || '—'}</td>
              <td>{i.valorMedicao || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PainelPrecificacao({ os, linhas, aoMudar, aoVoltar }) {
  const feedback = useFeedback();
  const [precos, setPrecos] = useState({});
  const [taxa, setTaxa] = useState(String(os.taxaDiagnostico ?? '0'));
  const ocupado = feedback.aExecutando;

  const valorDe = (linha) => Number(precos[linha.id] ?? linha.preco_unitario ?? 0);

  async function enviar(e) {
    e.preventDefault();
    const precosPayload = [
      ...linhas.servicos.map((s) => ({ tipo: 'servico', linhaId: s.id, preco: valorDe(s) })),
      ...linhas.pecas.map((p) => ({ tipo: 'peca', linhaId: p.id, preco: valorDe(p) })),
    ];
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/precificar`, { body: { taxaDiagnostico: Number(taxa), precos: precosPayload } }),
      { sucesso: 'Orçamento enviado ao cliente', carregando: 'A enviar orçamento…' },
    );
    if (r.ok) { aoMudar?.(); if (aoVoltar) setTimeout(aoVoltar, 1200); }
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3><IconCreditCard /> {os.numeroOS} — Precificar diagnóstico</h3>
        {aoVoltar && (
          <button className="botao botao-secundario" onClick={aoVoltar} disabled={ocupado} aria-busy={ocupado}>
            <IconArrowLeft /> Voltar
          </button>
        )}
      </div>
      <p><small>{os.descricaoProblema}</small></p>

      <ChecklistDiagnostico ordemId={os.id} />

      <form onSubmit={enviar}>
        <table className="tabela" style={{ marginTop: 12 }}>
          <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Preço unit. (MZN)</th><th>Subtotal</th></tr></thead>
          <tbody>
            {linhas.servicos.map((s) => (
              <tr key={`s${s.id}`}>
                <td>Serviço</td>
                <td>{s.descricao_snapshot}</td>
                <td>{s.quantidade}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: 110 }}
                    defaultValue={Number(s.preco_unitario) || ''}
                    onChange={(e) => setPrecos({ ...precos, [s.id]: e.target.value })}
                    placeholder="0.00"
                    required
                    disabled={ocupado}
                  />
                </td>
                <td>{fmtMoeda(valorDe(s) * s.quantidade)}</td>
              </tr>
            ))}
            {linhas.pecas.map((p) => (
              <tr key={`p${p.id}`}>
                <td>Peça</td>
                <td>Peça #{p.peca_id}</td>
                <td>{p.quantidade}</td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: 110 }}
                    defaultValue={Number(p.preco_unitario) || ''}
                    onChange={(e) => setPrecos({ ...precos, [p.id]: e.target.value })}
                    placeholder="0.00"
                    required
                    disabled={ocupado}
                  />
                </td>
                <td>{fmtMoeda(valorDe(p) * p.quantidade)}</td>
              </tr>
            ))}
            {linhas.servicos.length === 0 && linhas.pecas.length === 0 && (
              <tr><td colSpan="5" className="vazio">O mecânico não lançou serviços/peças.</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 12 }}>
          <label>Taxa de diagnóstico (cobrada se o cliente rejeitar) — MZN</label>
          <input
            type="number"
            min="0"
            step="0.01"
            style={{ width: 140 }}
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
            disabled={ocupado}
          />
        </div>

        <button className="botao" type="submit" disabled={ocupado} aria-busy={ocupado} style={{ marginTop: 16 }}>
          {ocupado ? 'A enviar…' : <><IconCheck /> Enviar Orçamento ao Cliente</>}
        </button>
      </form>
    </div>
  );
}

export function ValidarCortes({ os, aoMudar }) {
  const feedback = useFeedback();
  const ocupado = feedback.aExecutando;

  async function decidir(aprovada) {
    const r = await feedback.executar(
      () => api('POST', `/ordens/${os.id}/validar-revisao`, { body: { aprovada } }),
      {
        sucesso: aprovada ? 'Cortes aprovados' : 'Cortes recusados',
        sucessoDetalhe: aprovada ? 'Mecânico notificado.' : 'Cliente notificado para rever.',
        carregando: 'A validar…',
      },
    );
    if (r.ok) aoMudar?.();
  }

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <h3><IconSearch /> {os.numeroOS} — Validar cortes do cliente</h3>
      <p><small>O cliente removeu itens do orçamento. Confirma se a remoção é tecnicamente segura.</small></p>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button className="botao" onClick={() => decidir(true)} disabled={ocupado} aria-busy={ocupado}>
          <IconCheck /> Aprovar cortes
        </button>
        <button className="botao botao-perigo" onClick={() => decidir(false)} disabled={ocupado} aria-busy={ocupado}>
          <IconX /> Recusar cortes
        </button>
      </div>
    </div>
  );
}