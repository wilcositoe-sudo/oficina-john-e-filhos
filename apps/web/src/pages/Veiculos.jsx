import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// UI06: cliente gere os seus veículos (RN01 — titularidade validada no servidor).
export default function Veiculos() {
  const [veiculos, setVeiculos] = useState(null);
  const [erro, setErro] = useState('');
  const [matricula, setMatricula] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  async function carregar() {
    try {
      setVeiculos(await api('GET', '/veiculos'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function criar(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      await api('POST', '/veiculos', {
        body: {
          matricula,
          marca,
          modelo,
          ano: ano ? Number(ano) : undefined,
        },
      });
      setMatricula(''); setMarca(''); setModelo(''); setAno('');
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  if (veiculos === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Os meus veículos</h2>

      <form className="cartao form-servico" onSubmit={criar}>
        <h3>Registar veículo</h3>
        <label htmlFor="matricula">Matrícula</label>
        <input id="matricula" value={matricula} onChange={(e) => setMatricula(e.target.value)} required placeholder="MTZ 123 AB" />
        <label htmlFor="marca">Marca</label>
        <input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} required />
        <label htmlFor="modelo">Modelo</label>
        <input id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} required />
        <label htmlFor="ano">Ano (opcional)</label>
        <input id="ano" type="number" min="1950" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Registar veículo'}
        </button>
      </form>

      {veiculos.length === 0 ? (
        <p className="vazio">Ainda não tem veículos registados. Adicione o primeiro acima.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Matrícula</th><th>Marca</th><th>Modelo</th><th>Ano</th></tr>
          </thead>
          <tbody>
            {veiculos.map((v) => (
              <tr key={v.id}>
                <td>{v.matricula}</td>
                <td>{v.marca}</td>
                <td>{v.modelo}</td>
                <td>{v.ano ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}