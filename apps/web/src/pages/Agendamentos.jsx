import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtDataHora = (iso) =>
  new Date(iso).toLocaleString('pt-PT', { timeZone: 'Africa/Maputo', dateStyle: 'short', timeStyle: 'short' });
const fmtHora = (iso) =>
  new Date(iso).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' });

export default function Agendamentos() {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' }); // YYYY-MM-DD
  const [data, setData] = useState(amanha);
  const [slots, setSlots] = useState(null);
  const [veiculos, setVeiculos] = useState([]);
  const [veiculoId, setVeiculoId] = useState('');
  const [meus, setMeus] = useState(null);
  const [erro, setErro] = useState('');
  const [info, setInfo] = useState('');

  async function verSlots(d = data) {
    const r = await api('GET', `/agendamentos/disponibilidade?data=${d}`);
    setSlots(r.slots);
  }
  async function carregarMeus() {
    setMeus(await api('GET', '/agendamentos/meu'));
  }

  useEffect(() => {
    (async () => {
      const v = await api('GET', '/veiculos');
      setVeiculos(v);
      if (v.length > 0) setVeiculoId(v[0].id);
      await verSlots(amanha);
      await carregarMeus();
    })().catch((e) => setErro(e.message));
  }, []);

  async function agendar(slot) {
    setErro('');
    setInfo('');
    try {
      await api('POST', '/agendamentos', { body: { veiculoId: Number(veiculoId), inicioAt: slot.inicioAt } });
      setInfo(`Marcado para ${fmtDataHora(slot.inicioAt)}.`);
      await verSlots();
      await carregarMeus();
    } catch (err) {
      // 409 SLOT_INDISPONIVEL: o servidor é autoritativo — recarrega a grelha
      setErro(err.message);
      await verSlots();
    }
  }

  async function cancelar(id) {
    try {
      await api('POST', `/agendamentos/${id}/cancelar`);
      await verSlots();
      await carregarMeus();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <section>
      <h2>Marcar diagnóstico</h2>

      <div className="cartao form-servico">
        <label htmlFor="data">Data</label>
        <input id="data" type="date" value={data} min={new Date().toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' })}
          onChange={(e) => { setData(e.target.value); setSlots(null); verSlots(e.target.value); }} />
        <label htmlFor="veiculo">Veículo</label>
        <select id="veiculo" value={veiculoId} onChange={(e) => setVeiculoId(e.target.value)}>
          {veiculos.map((v) => (
            <option key={v.id} value={v.id}>{v.matricula} · {v.marca} {v.modelo}</option>
          ))}
        </select>
      </div>

      {slots && (
        <div className="slots">
          {slots.map((s) => (
            <button key={s.inicioAt} className="slot" disabled={!s.disponivel || !veiculoId}
              onClick={() => agendar(s)}>
              {fmtHora(s.inicioAt)}
            </button>
          ))}
        </div>
      )}

      {info && <p className="info">{info}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}

      <h2>Os meus agendamentos</h2>
      {meus === null ? <p>A carregar…</p> : meus.length === 0 ? (
        <p className="vazio">Sem agendamentos.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Início</th><th>Fim</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {meus.map((a) => (
              <tr key={a.id}>
                <td>{fmtDataHora(a.inicioAt)}</td>
                <td>{fmtDataHora(a.fimAt)}</td>
                <td>{a.estado}</td>
                <td>{['SOLICITADO', 'CONFIRMADO'].includes(a.estado) && new Date(a.inicioAt) > new Date() && (
                  <button className="botao botao-perigo" onClick={() => cancelar(a.id)}>Cancelar</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}