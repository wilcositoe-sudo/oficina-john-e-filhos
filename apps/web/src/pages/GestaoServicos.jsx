import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function GestaoServicos() {
  const [servicos, setServicos] = useState(null);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  async function carregar() {
    try {
      setServicos(await api('GET', '/servicos/todos'));
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
      await api('POST', '/servicos', { body: { nome, descricao, precoBase: preco } });
      setNome(''); setDescricao(''); setPreco('');
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAGuardar(false);
    }
  }

  async function desativar(id) {
    await api('PATCH', `/servicos/${id}/desativar`);
    await carregar();
  }

  if (servicos === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Gestão de serviços</h2>

      <form className="cartao form-servico" onSubmit={criar}>
        <h3>Novo serviço</h3>
        <label htmlFor="nome">Nome</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="descricao">Descrição (opcional)</label>
        <input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <label htmlFor="preco">Preço base (MZN)</label>
        <input id="preco" type="number" min="0" step="0.01" value={preco}
          onChange={(e) => setPreco(e.target.value)} required />
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="botao" type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : 'Criar serviço'}
        </button>
      </form>

      <table className="tabela">
        <thead>
          <tr><th>Nome</th><th>Preço</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          {servicos.map((s) => (
            <tr key={s.id}>
              <td>{s.nome}</td>
              <td>{Number(s.precoBase).toFixed(2)} MZN</td>
              <td>{s.ativo ? 'Ativo' : 'Inativo'}</td>
              <td>{s.ativo && <button className="botao botao-secundario" onClick={() => desativar(s.id)}>Desativar</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}