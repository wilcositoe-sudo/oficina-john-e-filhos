import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Registo from './pages/Registo.jsx';
import Catalogo from './pages/Catalogo.jsx';
import GestaoServicos from './pages/GestaoServicos.jsx';
import Pecas from './pages/Pecas.jsx';
import Veiculos from './pages/Veiculos.jsx';
import Orcamentos from './pages/Orcamentos.jsx';
import Agendamentos from './pages/Agendamentos.jsx';
import Ordens from './pages/Ordens.jsx';
import { api, getToken, setToken } from './lib/api.js';

export default function App() {
  const [vista, setVista] = useState('login');
  const [utilizador, setUtilizador] = useState(null);
  const [aCarregar, setACarregar] = useState(!!getToken());
  const [separador, setSeparador] = useState('catalogo');

  useEffect(() => {
    if (!getToken()) return;
    api('GET', '/auth/me')
      .then((u) => { setUtilizador(u); setVista('app'); })
      .catch(() => setToken(null))
      .finally(() => setACarregar(false));
  }, []);

  function aoSair() {
    api('POST', '/auth/logout').catch(() => {});
    setToken(null);
    setUtilizador(null);
    setVista('login');
    setSeparador('catalogo');
  }

  if (aCarregar) return <div className="centro">A carregar…</div>;
  if (vista === 'registo') {
    return (
      <Registo
        aoEntrar={(u) => { setUtilizador(u); setVista('app'); setSeparador('catalogo'); }}
        irParaLogin={() => setVista('login')}
      />
    );
  }
  if (vista !== 'app' || !utilizador) {
    return (
      <Login
        aoEntrar={(u) => { setUtilizador(u); setVista('app'); }}
        irParaRegisto={() => setVista('registo')}
      />
    );
  }

  const isCliente = utilizador.perfil === 'CLIENTE';
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);

  const tabs = [
    { id: 'catalogo', label: 'Catálogo', mostrar: true },
    { id: 'veiculos', label: 'Veículos', mostrar: isCliente },
    { id: 'gestao', label: 'Serviços', mostrar: isStaff },
    { id: 'pecas', label: 'Peças', mostrar: isStaff },
    { id: 'orcamentos', label: 'Orçamentos', mostrar: true },
    { id: 'ordens', label: 'Ordens de serviço', mostrar: true },
    { id: 'agenda', label: 'Agendamentos', mostrar: isCliente },
  ].filter((t) => t.mostrar);

  return (
    <div className="app">
      <header className="topo">
        <strong>Oficina John e Filhos</strong>
        <nav className="navegacao">
          {tabs.map((t) => (
            <button key={t.id}
              className={separador === t.id ? 'aba ativa' : 'aba'}
              onClick={() => setSeparador(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="topo-utilizador">{utilizador.nome} · {utilizador.perfil}</span>
        <button className="botao botao-secundario" onClick={aoSair}>Sair</button>
      </header>
      <main className="conteudo">
        {separador === 'catalogo' && <Catalogo />}
        {separador === 'veiculos' && <Veiculos />}
        {separador === 'gestao' && <GestaoServicos />}
        {separador === 'pecas' && <Pecas />}
        {separador === 'orcamentos' && <Orcamentos perfil={utilizador.perfil} />}
        {separador === 'ordens' && <Ordens perfil={utilizador.perfil} />}
        {separador === 'agenda' && <Agendamentos />}
      </main>
    </div>
  );
}