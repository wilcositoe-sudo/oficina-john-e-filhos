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
  const [idEdicao, setIdEdicao] = useState(null);

  async function carregar() {
    try {
      setVeiculos(await api('GET', '/veiculos'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  function limparFormulario() {
    setMatricula('');
    setMarca('');
    setModelo('');
    setAno('');
    setIdEdicao(null);
  }

  function editar(veiculo) {
    setIdEdicao(veiculo.id);
    setMatricula(veiculo.matricula);
    setMarca(veiculo.marca);
    setModelo(veiculo.modelo);
    setAno(veiculo.ano == null ? '' : String(veiculo.ano));
    setErro('');
  }

  async function guardar(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      const body = {
        matricula,
        marca,
        modelo,
        ano: ano === '' ? null : Number(ano),
      };
      if (idEdicao) {
        await api('PATCH', `/veiculos/${idEdicao}`, { body });
      } else {
        await api('POST', '/veiculos', { body });
      }
      limparFormulario();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível guardar o veículo.');
    } finally {
      setAGuardar(false);
    }
  }

  if (veiculos === null) {
    return erro
      ? <p className="erro" role="alert">Falha ao carregar veículos: {erro}</p>
      : <p>A carregar…</p>;
  }

  return (
    <section>
      <h2>Os meus veículos</h2>

      <form className="cartao form-servico" onSubmit={guardar}>
        <h3>{idEdicao ? 'Editar veículo' : 'Registar veículo'}</h3>
        <p className="hint">Os veículos associados a ordens de serviço não podem ser apagados; atualize os dados para preservar o histórico.</p>
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
          {aGuardar ? 'A guardar…' : idEdicao ? 'Guardar alterações' : 'Registar veículo'}
        </button>
        {idEdicao && (
          <button type="button" className="botao botao-secundario" onClick={limparFormulario} disabled={aGuardar}>
            Cancelar edição
          </button>
        )}
      </form>

      {veiculos.length === 0 ? (
        <p className="vazio">Ainda não tem veículos registados. Adicione o primeiro acima.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Matrícula</th><th>Marca</th><th>Modelo</th><th>Ano</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {veiculos.map((v) => (
              <tr key={v.id}>
                <td>{v.matricula}</td>
                <td>{v.marca}</td>
                <td>{v.modelo}</td>
                <td>{v.ano ?? '—'}</td>
                <td>
                  <button type="button" className="botao botao-secundario" onClick={() => editar(v)} disabled={aGuardar}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}