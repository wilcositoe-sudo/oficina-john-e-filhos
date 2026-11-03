import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;

export default function Admin() {
  const [separador, setSeparador] = useState('dashboard');

  return (
    <section>
      <h2>Administração</h2>
      <nav className="navegacao" style={{ marginBottom: 16, display: 'flex', gap: '8px' }}>
        <button 
          className={`aba ${separador === 'dashboard' ? 'ativa' : ''}`} 
          onClick={() => setSeparador('dashboard')}
          style={{ cursor: 'pointer' }}
        >
          Dashboard
        </button>
        <button 
          className={`aba ${separador === 'contas' ? 'ativa' : ''}`} 
          onClick={() => setSeparador('contas')}
          style={{ cursor: 'pointer' }}
        >
          Contas Internas
        </button>
      </nav>
      
      {separador === 'dashboard' && <Dashboard />}
      {separador === 'contas' && <ContasInternas />}
    </section>
  );
}

function Dashboard() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('GET', '/admin/dashboard')
      .then(setDados)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (!dados) return <p>A carregar dados do dashboard…</p>;

  return (
    <div>
      <div className="grelha-kpi">
        <div className="cartao kpi">
          <h3>Total de OS</h3>
          <p className="kpi-valor">{dados.totalOS}</p>
          <small>No período selecionado</small>
        </div>
        <div className="cartao kpi">
          <h3>Faturação</h3>
          <p className="kpi-valor">{fmtMoeda(dados.faturacaoTotal)}</p>
          <small>Pagamentos confirmados</small>
        </div>
        <div className="cartao kpi">
          <h3>Tempo Médio de Reparação</h3>
          <p className="kpi-valor">{dados.tempoMedioReparacaoHoras !== null ? `${dados.tempoMedioReparacaoHoras}h` : 'N/A'}</p>
          <small>Das OS concluídas</small>
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 24 }}>
        <h3>OS por Estado</h3>
        {Object.keys(dados.osPorEstado).length === 0 ? (
          <p className="vazio">Sem dados para o período.</p>
        ) : (
          <ul className="lista-simples">
            {Object.entries(dados.osPorEstado).map(([estado, qtd]) => (
              <li key={estado}><span>{estado}</span> <strong>{qtd}</strong></li>
            ))}
          </ul>
        )}
      </div>

      <div className="cartao" style={{ marginTop: 24 }}>
        <h3>Serviços Mais Solicitados</h3>
        {dados.servicosMaisSolicitados.length === 0 ? (
          <p className="vazio">Sem dados para o período.</p>
        ) : (
          <table className="tabela">
            <thead><tr><th>Serviço</th><th>Quantidade</th></tr></thead>
            <tbody>
              {dados.servicosMaisSolicitados.map((s, i) => (
                <tr key={i}><td>{s.nome}</td><td>{s.quantidade}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ContasInternas() {
  const [contas, setContas] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('FUNCIONARIO');

  async function carregar() {
    try {
      setContas(await api('GET', '/admin/utilizadores'));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function criar(e) {
    e.preventDefault();
    setErro('');
    setMsg('');
    try {
      await api('POST', '/admin/utilizadores', { body: { nome, email, senha, perfil } });
      setNome(''); setEmail(''); setSenha('');
      setMsg('Conta criada com sucesso.');
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function alternarAtivo(id, ativoAtual) {
    try {
      await api('PATCH', `/admin/utilizadores/${id}`, { body: { ativo: !ativoAtual } });
      await carregar();
    } catch (e) {
      setErro(e.message); // Mostra "Não é possível desativar o último administrador ativo" se aplicável
    }
  }

  if (!contas) return <p>A carregar contas…</p>;

  return (
    <div>
      <div className="cartao form-servico" style={{ marginBottom: 24 }}>
        <h3>Nova conta interna</h3>
        <form onSubmit={criar} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>Nome completo</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label>Senha (mín. 8)</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />
          </div>
          <div style={{ flex: '1 1 150px' }}>
            <label>Perfil</label>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
              <option value="FUNCIONARIO">Funcionário</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <button className="botao" type="submit" style={{ height: '42px' }}>Criar</button>
        </form>
        {msg && <p className="info" style={{ marginTop: 12 }}>{msg}</p>}
        {erro && <p className="erro" role="alert" style={{ marginTop: 12 }}>{erro}</p>}
      </div>

      <div className="cartao">
        <h3>Contas existentes</h3>
        <table className="tabela">
          <thead>
            <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Estado</th><th></th></tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.email}</td>
                <td>{c.perfil}</td>
                <td>{c.ativo ? <span className="badge badge-aprovado">Ativo</span> : <span className="badge badge-rejeitado">Inativo</span>}</td>
                <td>
                  <button 
                    className={`botao ${c.ativo ? 'botao-perigo' : 'botao-secundario'}`}
                    onClick={() => alternarAtivo(c.id, c.ativo)}
                  >
                    {c.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}