import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';

export default function GestaoServicos() {
  const feedback = useFeedback();
  const [servicos, setServicos] = useState(null);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [idEdicao, setIdEdicao] = useState(null);
  const [idAcao, setIdAcao] = useState(null);

  async function carregar() {
    try {
      setServicos(await api('GET', '/servicos/todos'));
      setErro('');
    } catch (err) {
      setErro(err.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function guardar(e) {
    e.preventDefault();
    setAGuardar(true);
    setErro('');
    try {
      const body = { nome, descricao: descricao.trim() || null, precoBase: preco };
      if (idEdicao) {
        await api('PATCH', `/servicos/${idEdicao}`, { body });
      } else {
        await api('POST', '/servicos', { body });
      }
      setNome(''); setDescricao(''); setPreco('');
      setIdEdicao(null);
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível guardar o serviço.');
    } finally {
      setAGuardar(false);
    }
  }

  function editar(servico) {
    setIdEdicao(servico.id);
    setNome(servico.nome);
    setDescricao(servico.descricao ?? '');
    setPreco(String(servico.precoBase));
    setErro('');
  }

  function cancelarEdicao() {
    setIdEdicao(null);
    setNome('');
    setDescricao('');
    setPreco('');
    setErro('');
  }

  async function apagar(servico) {
    const confirmado = await feedback.confirmar({
      titulo: 'Apagar serviço',
      mensagem: `Apagar o serviço "${servico.nome}"? As linhas históricas de orçamentos e OS serão preservadas.`,
      textoConfirmar: 'Apagar serviço',
      perigo: true,
    });
    if (!confirmado) return;

    setIdAcao(servico.id);
    setErro('');
    try {
      await api('DELETE', `/servicos/${servico.id}`);
      if (String(idEdicao) === String(servico.id)) cancelarEdicao();
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível apagar o serviço.');
    } finally {
      setIdAcao(null);
    }
  }

  async function alternarAtivo(servico) {
    setIdAcao(servico.id);
    setErro('');
    try {
      await api('PATCH', `/servicos/${servico.id}`, { body: { ativo: !servico.ativo } });
      await carregar();
    } catch (err) {
      setErro(err.message || 'Não foi possível atualizar o estado do serviço.');
    } finally {
      setIdAcao(null);
    }
  }

  if (servicos === null) {
    return erro
      ? <p className="erro" role="alert">Falha ao carregar serviços: {erro}</p>
      : <p>A carregar…</p>;
  }

  return (
    <section>
      <h2>Gestão de serviços</h2>

      <form className="cartao form-servico" onSubmit={guardar}>
        <h3>{idEdicao ? 'Editar serviço' : 'Novo serviço'}</h3>
        <label htmlFor="nome">Nome</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <label htmlFor="descricao">Descrição (opcional)</label>
        <input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <label htmlFor="preco">Preço base (MZN)</label>
        <input id="preco" type="number" min="0" step="0.01" value={preco}
          onChange={(e) => setPreco(e.target.value)} required />
        <button className="botao" type="submit" disabled={aGuardar}>
          {aGuardar ? 'A guardar…' : idEdicao ? 'Guardar alterações' : 'Criar serviço'}
        </button>
        {idEdicao && (
          <button type="button" className="botao botao-secundario" onClick={cancelarEdicao} disabled={aGuardar}>
            Cancelar edição
          </button>
        )}
      </form>

      {erro && <p className="erro" role="alert">{erro}</p>}
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
              <td className="acoes-tabela">
                <button type="button" className="botao botao-secundario" onClick={() => editar(s)} disabled={idAcao !== null}>
                  Editar
                </button>
                <button
                  type="button"
                  className={`botao ${s.ativo ? 'botao-perigo' : 'botao-secundario'}`}
                  onClick={() => alternarAtivo(s)}
                  disabled={idAcao === s.id}
                >
                  {idAcao === s.id ? 'A atualizar…' : s.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  type="button"
                  className="botao botao-perigo"
                  onClick={() => apagar(s)}
                  disabled={idAcao === s.id}
                >
                  {idAcao === s.id ? 'A apagar…' : 'Apagar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}