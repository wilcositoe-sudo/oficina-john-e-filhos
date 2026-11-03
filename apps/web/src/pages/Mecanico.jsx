import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const ROTULO_ESTADO = {
  PENDENTE: 'Pendente',
  EM_DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_PRECO_FUNCIONARIO: 'Aguarda precificação',
  AGUARDANDO_APROVACAO_CLIENTE: 'Aguarda cliente',
  AGUARDANDO_VALIDACAO_FUNCIONARIO: 'Aguarda validação',
  EM_REPARACAO: 'Em reparação',
  AGUARDANDO_PECAS: 'Aguarda peças',
  CONCLUIDA: 'Concluída',
  PAGA: 'Paga',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

const ROTULO_ESTADO_CHECK = {
  OK: '✅ OK',
  DESGASTE: '⚠️ Desgaste',
  AVARIADO: '❌ Avariado',
  SUBSTITUIR: '🔄 Substituir',
};

const fmtData = (iso) => iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '—';

export default function Mecanico() {
  const [lista, setLista] = useState(null);
  const [osAberta, setOsAberta] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar() {
    try {
      setLista(await api('GET', '/ordens/minhas'));
      setErro('');
    } catch (e) { setErro(e.message); }
  }
  useEffect(() => { carregar(); }, []);

  async function abrirOs(id) {
    setErro(''); setMsg('');
    try {
      const os = await api('GET', `/ordens/${id}`);
      setOsAberta(os);
    } catch (e) { setErro(e.message); }
  }

  function fecharOs() { setOsAberta(null); setMsg(''); }

  if (lista === null) return <p className="centro">A carregar as tuas ordens…</p>;

  return (
    <section>
      <h2>🔧 Painel do Mecânico</h2>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {osAberta ? (
        <FormularioDiagnostico os={osAberta} aoVoltar={fecharOs} aoSubmeter={carregar} />
      ) : (
        <>
          {lista.length === 0 ? (
            <p className="vazio">Não tens ordens de serviço atribuídas de momento.</p>
          ) : (
            <table className="tabela">
              <thead>
                <tr><th>Número</th><th>Estado</th><th>Problema</th><th>Criada</th><th></th></tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.id}>
                    <td><strong>{o.numeroOS}</strong></td>
                    <td><span className={`badge badge-${o.estado.toLowerCase()}`}>{ROTULO_ESTADO[o.estado] ?? o.estado}</span></td>
                    <td>{o.descricaoProblema?.slice(0, 60)}{o.descricaoProblema?.length > 60 ? '…' : ''}</td>
                    <td>{fmtData(o.createdAt)}</td>
                    <td>
                      {o.estado === 'EM_DIAGNOSTICO' ? (
                        <button className="botao" onClick={() => abrirOs(o.id)}>Diagnosticar</button>
                      ) : (
                        <button className="botao botao-secundario" onClick={() => abrirOs(o.id)}>Ver</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

// ==========================================
// FORMULÁRIO DE DIAGNÓSTICO
// ==========================================
function FormularioDiagnostico({ os, aoVoltar, aoSubmeter }) {
  const [checklist, setChecklist] = useState([{ item: '', estado: 'OK', observacao: '', valorMedicao: '' }]);
  const [servicos, setServicos] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [catalogoServicos, setCatalogoServicos] = useState([]);
  const [catalogoPecas, setCatalogoPecas] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // Carregar catálogos (sem preços visíveis para o mecânico)
  useEffect(() => {
    api('GET', '/servicos/todos').then((s) => setCatalogoServicos(s.filter(x => x.ativo))).catch(() => {});
    api('GET', '/pecas').then((p) => setCatalogoPecas(p.filter(x => x.ativo))).catch(() => {});
  }, []);

  // --- Checklist ---
  function addChecklistItem() {
    setChecklist([...checklist, { item: '', estado: 'OK', observacao: '', valorMedicao: '' }]);
  }
  function removeChecklistItem(i) {
    setChecklist(checklist.filter((_, idx) => idx !== i));
  }
  function updateChecklist(i, campo, valor) {
    const nova = [...checklist];
    nova[i][campo] = valor;
    setChecklist(nova);
  }

  // --- Serviços (sem preço) ---
  function addServico() {
    setServicos([...servicos, { servicoId: '', quantidade: 1, descricao: '' }]);
  }
  function removeServico(i) {
    setServicos(servicos.filter((_, idx) => idx !== i));
  }
  function updateServico(i, campo, valor) {
    const nova = [...servicos];
    if (campo === 'servicoId') {
      const s = catalogoServicos.find(x => String(x.id) === valor);
      nova[i].descricao = s?.nome ?? '';
    }
    nova[i][campo] = valor;
    setServicos(nova);
  }

  // --- Peças (sem preço) ---
  function addPeca() {
    setPecas([...pecas, { pecaId: '', quantidade: 1 }]);
  }
  function removePeca(i) {
    setPecas(pecas.filter((_, idx) => idx !== i));
  }
  function updatePeca(i, campo, valor) {
    const nova = [...pecas];
    nova[i][campo] = valor;
    setPecas(nova);
  }

  // --- Fotos (simuladas — em produção seria upload real) ---
  function addFoto() {
    const url = prompt('URL da foto (ou deixa vazio para simular):') || `https://picsum.photos/seed/os${os.id}-${fotos.length}/400/300`;
    setFotos([...fotos, { url, legenda: '' }]);
  }
  function removeFoto(i) {
    setFotos(fotos.filter((_, idx) => idx !== i));
  }

  // --- Submeter ---
  async function submeter(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const payload = {
        checklist: checklist.filter(c => c.item.trim()),
        servicos: servicos.filter(s => s.servicoId).map(s => ({
          servicoId: Number(s.servicoId),
          quantidade: Number(s.quantidade) || 1,
          descricao: s.descricao,
        })),
        pecas: pecas.filter(p => p.pecaId).map(p => ({
          pecaId: Number(p.pecaId),
          quantidade: Number(p.quantidade) || 1,
        })),
      };
      await api('POST', `/ordens/${os.id}/diagnostico`, { body: payload });
      aoSubmeter();
      aoVoltar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  const podeEditar = os.estado === 'EM_DIAGNOSTICO';

  return (
    <div className="cartao" style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>{os.numeroOS} — Diagnóstico Técnico</h3>
        <button className="botao botao-secundario" onClick={aoVoltar}>← Voltar à lista</button>
      </div>

      {/* Info do veículo/problema (sem preços!) */}
      <div style={{ background: '#F3F7FA', padding: 12, borderRadius: 8, marginBottom: 16 }}>
        <p><strong>Problema reportado:</strong> {os.descricaoProblema}</p>
        <p><small>Estado: {ROTULO_ESTADO[os.estado] ?? os.estado} · Criada: {fmtData(os.createdAt)}</small></p>
      </div>

      {!podeEditar && (
        <p className="info">Esta OS não está em estado de diagnóstico. Apenas podes consultar.</p>
      )}

      {podeEditar && (
        <form onSubmit={submeter}>
          {/* CHECKLIST TÉCNICO */}
          <fieldset style={{ border: '1px solid #E3EAF0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend><strong>📋 Checklist Técnico</strong></legend>
            {checklist.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  <label>Componente / Sistema</label>
                  <input value={c.item} onChange={(e) => updateChecklist(i, 'item', e.target.value)} placeholder="Ex: Travões dianteiros" required />
                </div>
                <div>
                  <label>Estado</label>
                  <select value={c.estado} onChange={(e) => updateChecklist(i, 'estado', e.target.value)}>
                    {Object.entries(ROTULO_ESTADO_CHECK).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                  </select>
                </div>
                <div>
                  <label>Observação</label>
                  <input value={c.observacao} onChange={(e) => updateChecklist(i, 'observacao', e.target.value)} placeholder="Ex: 30% de vida restante" />
                </div>
                <div>
                  <label>Medição</label>
                  <input value={c.valorMedicao} onChange={(e) => updateChecklist(i, 'valorMedicao', e.target.value)} placeholder="Ex: 3.2mm" />
                </div>
                <button type="button" className="botao botao-perigo" onClick={() => removeChecklistItem(i)} style={{ height: 38 }}>✕</button>
              </div>
            ))}
            <button type="button" className="botao botao-secundario" onClick={addChecklistItem}>+ Adicionar item</button>
          </fieldset>

          {/* SERVIÇOS NECESSÁRIOS (sem preço) */}
          <fieldset style={{ border: '1px solid #E3EAF0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend><strong>🔧 Serviços Necessários</strong> <small>(o funcionário atribuirá os preços)</small></legend>
            {servicos.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  <label>Serviço</label>
                  <select value={s.servicoId} onChange={(e) => updateServico(i, 'servicoId', e.target.value)} required>
                    <option value="">— escolher —</option>
                    {catalogoServicos.map(sv => (<option key={sv.id} value={sv.id}>{sv.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label>Qtd.</label>
                  <input type="number" min="1" value={s.quantidade} onChange={(e) => updateServico(i, 'quantidade', e.target.value)} />
                </div>
                <button type="button" className="botao botao-perigo" onClick={() => removeServico(i)} style={{ height: 38 }}>✕</button>
              </div>
            ))}
            <button type="button" className="botao botao-secundario" onClick={addServico}>+ Adicionar serviço</button>
          </fieldset>

          {/* PEÇAS NECESSÁRIAS (sem preço) */}
          <fieldset style={{ border: '1px solid #E3EAF0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend><strong>⚙️ Peças Necessárias</strong> <small>(o funcionário atribuirá os preços)</small></legend>
            {pecas.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                <div>
                  <label>Peça</label>
                  <select value={p.pecaId} onChange={(e) => updatePeca(i, 'pecaId', e.target.value)} required>
                    <option value="">— escolher —</option>
                    {catalogoPecas.map(pc => (<option key={pc.id} value={pc.id}>{pc.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label>Qtd.</label>
                  <input type="number" min="1" value={p.quantidade} onChange={(e) => updatePeca(i, 'quantidade', e.target.value)} />
                </div>
                <button type="button" className="botao botao-perigo" onClick={() => removePeca(i)} style={{ height: 38 }}>✕</button>
              </div>
            ))}
            <button type="button" className="botao botao-secundario" onClick={addPeca}>+ Adicionar peça</button>
          </fieldset>

          {/* FOTOS DAS AVARIAS */}
          <fieldset style={{ border: '1px solid #E3EAF0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <legend><strong>📸 Fotos das Avarias</strong></legend>
            {fotos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {fotos.map((f, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={f.url} alt={`Foto ${i + 1}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} />
                    <button type="button" onClick={() => removeFoto(i)} style={{ position: 'absolute', top: 2, right: 2, background: '#B03A2E', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="botao botao-secundario" onClick={addFoto}>+ Anexar foto</button>
          </fieldset>

          {erro && <p className="erro" role="alert">{erro}</p>}

          <button className="botao botao-grande" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'A submeter…' : '✅ Finalizar Diagnóstico e Enviar ao Funcionário'}
          </button>
        </form>
      )}
    </div>
  );
}