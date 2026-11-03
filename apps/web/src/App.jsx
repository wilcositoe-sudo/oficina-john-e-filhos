import { useEffect, useState } from 'react';
import SplashScreen from './pages/SplashScreen.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Registo from './pages/Registo.jsx';
import RecuperarSenha from './pages/RecuperarSenha.jsx';
import RedefinirSenha from './pages/RedefinirSenha.jsx';
import Catalogo from './pages/Catalogo.jsx';
import GestaoServicos from './pages/GestaoServicos.jsx';
import Pecas from './pages/Pecas.jsx';
import Veiculos from './pages/Veiculos.jsx';
import Orcamentos from './pages/Orcamentos.jsx';
import Agendamentos from './pages/Agendamentos.jsx';
import Ordens from './pages/Ordens.jsx';
import Avaliacoes from './pages/Avaliacoes.jsx';
import Admin from './pages/Admin.jsx';
import { api, getToken, setToken } from './lib/api.js';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [vista, setVista] = useState('landing'); // 'landing' | 'login' | 'registo' | 'recuperar' | 'redefinir' | 'app'
  const [utilizador, setUtilizador] = useState(null);
  const [aCarregar, setACarregar] = useState(!!getToken());
  const [separador, setSeparador] = useState('catalogo');

  // Após splash, tenta restaurar sessão guardada
  useEffect(() => {
    if (!splashDone) return;
    if (!getToken()) { 
      setACarregar(false); 
      return; 
    }
    
    api('GET', '/auth/me')
      .then((u) => { 
        setUtilizador(u); 
        setVista('app'); 
      })
      .catch(() => setToken(null))
      .finally(() => setACarregar(false));
  }, [splashDone]);

  function aoSair() {
    api('POST', '/auth/logout').catch(() => {});
    setToken(null);
    setUtilizador(null);
    setVista('landing');
    setSeparador('catalogo');
  }

  // 1) Splash inicial (aparece apenas na primeira carga)
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  // 2) A verificar sessão guardada (loading state)
  if (aCarregar) {
    return <div className="centro"><p>A carregar…</p></div>;
  }

  // 3) Fluxo público: landing / login / registo / recuperação
  if (vista === 'landing') {
    return (
      <Landing 
        irParaLogin={() => setVista('login')} 
        irParaRegisto={() => setVista('registo')} 
      />
    );
  }
  
  if (vista === 'registo') {
    return (
      <Registo 
        aoEntrar={(u) => { setUtilizador(u); setVista('app'); setSeparador('catalogo'); }} 
        irParaLogin={() => setVista('login')} 
      />
    );
  }
  
  if (vista === 'recuperar') {
    return (
      <RecuperarSenha 
        irParaLogin={() => setVista('login')} 
        irParaRedefinirComToken={(tokenRecebido) => {
          sessionStorage.setItem('reset_token_temp', tokenRecebido);
          setVista('redefinir');
        }}
      />
    );
  }
  
  if (vista === 'redefinir') {
    const tokenTemp = sessionStorage.getItem('reset_token_temp') || '';
    sessionStorage.removeItem('reset_token_temp'); // Limpa para não ficar lixo
    
    return (
      <RedefinirSenha 
        irParaLogin={() => setVista('login')} 
        tokenInicial={tokenTemp}
      />
    );
  }

  if (vista === 'login' || !utilizador) {
    return (
      <Login
        aoEntrar={(u) => { setUtilizador(u); setVista('app'); }}
        irParaRegisto={() => setVista('registo')}
        irParaLanding={() => setVista('landing')}
        irParaRecuperar={() => setVista('recuperar')}
      />
    );
  }

  // 4) App autenticada (Definição de abas por perfil)
  const isCliente = utilizador.perfil === 'CLIENTE';
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
  const isAdmin = utilizador.perfil === 'ADMINISTRADOR';

  const tabs = [
    { id: 'catalogo', label: 'Catálogo', mostrar: true },
    { id: 'avaliacoes', label: 'Avaliações', mostrar: true },
    { id: 'veiculos', label: 'Veículos', mostrar: isCliente },
    { id: 'gestao', label: 'Serviços', mostrar: isStaff },
    { id: 'pecas', label: 'Peças', mostrar: isStaff },
    { id: 'orcamentos', label: 'Orçamentos', mostrar: true },
    { id: 'ordens', label: 'Ordens de serviço', mostrar: true },
    { id: 'agenda', label: 'Agendamentos', mostrar: isCliente },
    { id: 'admin', label: 'Administração', mostrar: isAdmin },
  ].filter((t) => t.mostrar);

  return (
    <div className="app">
      <header className="topo">
        <strong>Oficina John e Filhos</strong>
        <nav className="navegacao">
          {tabs.map((t) => (
            <button 
              key={t.id}
              className={separador === t.id ? 'aba ativa' : 'aba'}
              onClick={() => setSeparador(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span className="topo-utilizador">{utilizador.nome} · {utilizador.perfil}</span>
        <button className="botao botao-secundario" onClick={aoSair}>Sair</button>
      </header>
      
      <main className="conteudo">
        {separador === 'catalogo' && <Catalogo />}
        {separador === 'avaliacoes' && <Avaliacoes />}
        {separador === 'veiculos' && <Veiculos />}
        {separador === 'gestao' && <GestaoServicos />}
        {separador === 'pecas' && <Pecas />}
        {separador === 'orcamentos' && <Orcamentos perfil={utilizador.perfil} />}
        {separador === 'ordens' && <Ordens perfil={utilizador.perfil} />}
        {separador === 'agenda' && <Agendamentos />}
        {separador === 'admin' && <Admin />}
      </main>
    </div>
  );
}