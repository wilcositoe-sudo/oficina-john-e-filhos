import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import RelatoriosAdmin from '../components/RelatoriosAdmin.jsx';
import { useFeedback } from '../components/Feedback.jsx';
import { IconChart, IconLightbulb, IconStar, IconUsers } from '../components/icons.jsx';
import Estrelas from '../components/Estrelas.jsx';

export default function Admin() {
  const [separador, setSeparador] = useState('dashboard');
  const feedback = useFeedback();

  return (
    <section>
      <h2>Administração do Sistema</h2>
      <nav className="navegacao admin-abas" aria-label="Secções de administração">
        <button
          type="button"
          className={`aba ${separador === 'dashboard' ? 'ativa' : ''}`}
          onClick={() => setSeparador('dashboard')}
          aria-pressed={separador === 'dashboard'}
        >
          <IconChart /> Dashboard
        </button>
        <button
          type="button"
          className={`aba ${separador === 'contas' ? 'ativa' : ''}`}
          onClick={() => setSeparador('contas')}
          aria-pressed={separador === 'contas'}
        >
          <IconUsers /> Contas Internas
        </button>
        <button
          type="button"
          className={`aba ${separador === 'avaliacoes' ? 'ativa' : ''}`}
          onClick={() => setSeparador('avaliacoes')}
          aria-pressed={separador === 'avaliacoes'}
        >
          <IconStar /> Moderação de Avaliações
        </button>
      </nav>

      <div className="admin-conteudo" role="tabpanel">
        {separador === 'dashboard' && <RelatoriosAdmin />}
        {separador === 'contas' && <ContasInternas feedback={feedback} />}
        {separador === 'avaliacoes' && <ModerarAvaliacoes />}
      </div>
    </section>
  );
}

// ==========================================
// CONTAS INTERNAS (Fase 4A: permissão de catálogo)
// ==========================================
function ContasInternas({ feedback }) {
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
    setErro(''); setMsg('');
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
    setErro(''); setMsg('');
    try {
      await api('PATCH', `/admin/utilizadores/${id}`, { body: { ativo: !ativoAtual } });
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function apagarConta(conta) {
    const confirmado = await feedback.confirmar({
      titulo: 'Apagar conta interna',
      mensagem: `Apagar a conta de "${conta.nome}"? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Apagar conta',
      perigo: true,
    });
    if (!confirmado) return;
    setErro('');
    setMsg('');
    try {
      await api('DELETE', `/admin/utilizadores/${conta.id}`);
      setMsg(`Conta de ${conta.nome} apagada.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  // ★ Fase 4A — autorizar/revogar permissão de gerir catálogo (serviços/peças)
  async function alternarCatalogo(id, podeAtual) {
    setErro(''); setMsg('');
    try {
      await api('PATCH', `/admin/utilizadores/${id}/permissao-catalogo`, {
        body: { podeGerirCatalogo: !podeAtual },
      });
      setMsg(
        !podeAtual
          ? 'Funcionário autorizado a criar/editar serviços e peças.'
          : 'Permissão de catálogo revogada.',
      );
      await carregar();
      setTimeout(() => setMsg(''), 3500);
    } catch (e) {
      setErro(e.message);
    }
  }

  if (contas === null) {
    return erro ? (
      <div className="cartao admin-estado-erro">
        <p className="erro" role="alert">Não foi possível carregar as contas: {erro}</p>
        <button type="button" className="botao botao-secundario" onClick={carregar}>
          Tentar novamente
        </button>
      </div>
    ) : <p role="status">A carregar contas…</p>;
  }

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
              <option value="FUNCIONARIO">Funcionário (Atendente)</option>
              <option value="MECANICO">Mecânico</option>
              <option value="ADMINISTRADOR">Administrador</option>
            </select>
          </div>
          <button className="botao" type="submit" style={{ height: '42px' }}>Criar</button>
        </form>
        <p className="hint" style={{ marginTop: 10 }}>
          <IconLightbulb /> <strong>Permissão de catálogo:</strong> só administradores e funcionários autorizados
          conseguem criar/editar serviços e peças. Autoriza um funcionário na tabela abaixo.
          O mecânico não precisa disto — ele propõe itens (do catálogo ou personalizados).
        </p>
        {msg && <p className="info" style={{ marginTop: 12 }}>{msg}</p>}
        {erro && <p className="erro" role="alert" style={{ marginTop: 12 }}>{erro}</p>}
      </div>

      <div className="cartao">
        <h3>Contas existentes</h3>
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th>Catálogo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.map((c) => (
              <tr key={c.id}>
                <td>{c.nome}</td>
                <td>{c.email}</td>
                <td>{c.perfil}</td>
                <td>
                  {c.ativo
                    ? <span className="badge badge-aprovado">Ativo</span>
                    : <span className="badge badge-rejeitado">Inativo</span>}
                </td>

                {/* ★ Coluna Catálogo */}
                <td>
                  {c.perfil === 'ADMINISTRADOR' && (
                    <span className="badge badge-aprovado" title="Administradores têm permissão automática">
                      Automática
                    </span>
                  )}

                  {c.perfil === 'MECANICO' && (
                    <span className="hint" title="Mecânico propõe itens; não gerir o catálogo">—</span>
                  )}

                  {c.perfil === 'FUNCIONARIO' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${c.podeGerirCatalogo ? 'badge-aprovado' : 'badge-rejeitado'}`}>
                        {c.podeGerirCatalogo ? 'Autorizado' : 'Não autorizado'}
                      </span>
                      <button
                        className={`botao ${c.podeGerirCatalogo ? 'botao-perigo' : 'botao-secundario'}`}
                        onClick={() => alternarCatalogo(c.id, c.podeGerirCatalogo)}
                        style={{ fontSize: '0.8rem', padding: '3px 7px' }}
                        title={
                          c.podeGerirCatalogo
                            ? 'Revogar permissão de criar/editar serviços e peças'
                            : 'Autorizar a criar/editar serviços e peças'
                        }
                      >
                        {c.podeGerirCatalogo ? 'Revogar' : 'Autorizar'}
                      </button>
                    </div>
                  )}
                </td>

                <td>
                  <div className="acoes-tabela">
                    <button
                      className={`botao ${c.ativo ? 'botao-perigo' : 'botao-secundario'}`}
                      onClick={() => alternarAtivo(c.id, c.ativo)}
                      style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                    >
                      {c.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      className="botao botao-perigo"
                      onClick={() => apagarConta(c)}
                      style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                    >
                      Apagar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// MODERAÇÃO DE AVALIAÇÕES (F12)
// ==========================================
function ModerarAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar() {
    try {
      setAvaliacoes(await api('GET', '/admin/avaliacoes'));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }

  useEffect(() => { carregar(); }, []);

  async function alternarPublicacao(id, estadoAtual) {
    try {
      await api('PATCH', `/admin/avaliacoes/${id}`, { body: { publicada: !estadoAtual } });
      setMsg('Estado atualizado.');
      await carregar();
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!avaliacoes) return <p>A carregar avaliações…</p>;

  return (
    <div className="cartao">
      <h3>Avaliações dos Clientes</h3>
      {msg && <p className="info">{msg}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}

      {avaliacoes.length === 0 ? (
        <p className="vazio">Sem avaliações registadas.</p>
      ) : (
        <table className="tabela">
          <thead>
            <tr><th>Cliente</th><th>Data</th><th>Nota</th><th>Comentário</th><th>Estado</th><th>Ação</th></tr>
          </thead>
          <tbody>
            {avaliacoes.map((a) => (
              <tr key={a.id} style={{ opacity: a.publicada ? 1 : 0.5 }}>
                <td>{a.clienteNome}</td>
                <td>{fmtData(a.createdAt)}</td>
                <td><Estrelas valor={a.classificacao} /></td>
                <td>{a.comentario || '—'}</td>
                <td>
                  {a.publicada
                    ? <span className="badge badge-aprovado">Publicada</span>
                    : <span className="badge badge-rejeitado">Ocultada</span>}
                </td>
                <td>
                  <button
                    className={`botao ${a.publicada ? 'botao-perigo' : 'botao-secundario'}`}
                    onClick={() => alternarPublicacao(a.id, a.publicada)}
                    style={{ fontSize: '0.85rem', padding: '4px 8px' }}
                  >
                    {a.publicada ? 'Ocultar' : 'Publicar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}