import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

// UI19 (peças): staff gere catálogo de peças e stock.
export default function Pecas() {
  const [pecas, setPecas] = useState(null);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [stock, setStock] = useState('0');
  const [aGuardar, setAGuardar] = useState(false);

  async function carregar() {
    try {
      setPecas(await api('GET', '/pecas'));
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
      await api('POST', '/pecas', { body: { nome, precoUnitario: preco, quantidadeStock: Number(stock) } });
      setNome(''); setPreco(''); setStock('0');
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  if (pecas === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Gestão de peças</h2>
      <form className="cartao form-servico" onSubmit={criar}>
        <h3>Nova peça</h3>
        <label htmlFor="nomePeca">Nome</label>
        <input id="nomePeca" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="precoPeca">Preço unitário (MZN)</label>
        <input id="precoPeca" type="number" min="0" step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} required />
        <label htmlFor="stockPeca">Stock inicial</label>
        <input id="stockPeca" type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Criar peça'}
        </button>
      </form>

      {pecas.length === 0 ? (
        <p className="vazio">Sem peças registadas.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>Preço un.</th><th>Stock</th></tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td>{Number(p.precoUnitario).toFixed(2)} MZN</td>
                <td className={p.quantidadeStock === 0 ? 'erro' : ''}>{p.quantidadeStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}