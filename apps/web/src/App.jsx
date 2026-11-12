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
import Mecanico from './pages/Mecanico.jsx';
import Precificacao from './pages/Precificacao.jsx';
import Assistente from './pages/Assistente.jsx';
import AtendimentoChat from './pages/AtendimentoChat.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Perfil from './pages/Perfil.jsx';
import Mapa from './pages/Mapa.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { absolutaUrl, api, getToken, setToken } from './lib/api.js';
import SinoNotificacoes from './components/SinoNotificacoes.jsx';
import { FeedbackProvider } from './components/Feedback.jsx';
import {
  IconChat,
  IconWrench,
  IconCreditCard,
  IconPhone,
  IconClipboard,
  IconStar,
  IconUser,
  IconTruck,
  IconBolt,
  IconMap,
} from './components/icons.jsx';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [vista, setVista] = useState('landing'); // 'landing' | 'login' | 'registo' | 'recuperar' | 'redefinir' | 'app'
  const [utilizador, setUtilizador] = useState(null);
  const [aCarregar, setACarregar] = useState(!!getToken());
  const [separador, setSeparador] = useState('dashboard');

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
    setSeparador('dashboard');
  }

  function exigirNovoLogin() {
    setToken(null);
    setUtilizador(null);
    setVista('login');
    setSeparador('dashboard');
  }

  // 1) Splash inicial
  if (!splashDone) return <SplashScreen onDone={() => setSplashDone(true)} />;

  // 2) A verificar sessão guardada
  if (aCarregar) {
    return (
      <div className="centro">
        <p>A carregar…</p>
      </div>
    );
  }

  // 3) Fluxo público
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
    sessionStorage.removeItem('reset_token_temp');

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
        aoEntrar={(u) => {
          setUtilizador(u);
          setVista('app');
        }}
        irParaRegisto={() => setVista('registo')}
        irParaLanding={() => setVista('landing')}
        irParaRecuperar={() => setVista('recuperar')}
      />
    );
  }

  // 4) App autenticada — abas por perfil
  const isCliente = utilizador.perfil === 'CLIENTE';
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
  const isAdmin = utilizador.perfil === 'ADMINISTRADOR';
  const isMecanico = utilizador.perfil === 'MECANICO';

  const tabs = [
    { id: 'dashboard', label: 'Painel', mostrar: true },
    { id: 'perfil', label: 'Perfil', mostrar: true },
    { id: 'mapa', label: 'Mapa', mostrar: true },
    { id: 'catalogo', label: 'Catálogo', mostrar: true },
    { id: 'avaliacoes', label: 'Avaliações', mostrar: true },
    { id: 'assistente', label: 'Assistente', mostrar: isCliente },
    { id: 'veiculos', label: 'Veículos', mostrar: isCliente },
    { id: 'gestao', label: 'Serviços', mostrar: isStaff },
    { id: 'pecas', label: 'Peças', mostrar: isStaff },
    { id: 'orcamentos', label: 'Orçamentos', mostrar: isStaff || isCliente },
    { id: 'ordens', label: 'Ordens de serviço', mostrar: isStaff || isCliente },
    { id: 'agenda', label: 'Agendamentos', mostrar: isCliente },
    { id: 'mecanico', label: 'Minhas OS', mostrar: isMecanico },
    { id: 'precificacao', label: 'Precificação', mostrar: isStaff },
    { id: 'atendimento', label: 'Atendimento', mostrar: isStaff },
    { id: 'admin', label: 'Administração', mostrar: isAdmin },
  ].filter((t) => t.mostrar);

  const gruposNavegacao = [
    { label: 'Início', ids: ['dashboard', 'perfil', 'mapa'] },
    { label: 'Explorar', ids: ['catalogo', 'avaliacoes'] },
    { label: 'Atendimento', ids: ['assistente', 'atendimento', 'agenda'] },
    {
      label: 'Oficina',
      ids: ['veiculos', 'gestao', 'pecas', 'orcamentos', 'ordens', 'mecanico', 'precificacao'],
    },
    { label: 'Sistema', ids: ['admin'] },
  ]
    .map((grupo) => ({
      ...grupo,
      tabs: grupo.ids.map((id) => tabs.find((tab) => tab.id === id)).filter(Boolean),
    }))
    .filter((grupo) => grupo.tabs.length > 0);

  const iconesNavegacao = {
    dashboard: IconClipboard,
    perfil: IconUser,
    mapa: IconMap,
    catalogo: IconWrench,
    avaliacoes: IconStar,
    assistente: IconChat,
    veiculos: IconTruck,
    gestao: IconBolt,
    pecas: IconWrench,
    orcamentos: IconClipboard,
    ordens: IconClipboard,
    agenda: IconPhone,
    mecanico: IconWrench,
    precificacao: IconCreditCard,
    atendimento: IconChat,
    admin: IconUser,
  };
  const paginaAtual = tabs.find((tab) => tab.id === separador);

  return (
    <FeedbackProvider>
      <div className="app-shell">
        <aside className="app-sidebar">
          <div className="app-brand">
            <span className="app-brand-mark">
              <IconWrench style={{ margin: 0, verticalAlign: 'middle' }} />
            </span>
            <span>
              <strong>Oficina John</strong>
              <small>Gestão automóvel</small>
            </span>
          </div>

          <nav className="app-sidebar-nav" aria-label="Navegação principal">
            {gruposNavegacao.map((grupo) => (
              <div className="app-nav-group" key={grupo.label}>
                <span className="app-nav-heading">{grupo.label}</span>
                {grupo.tabs.map((tab) => {
                  const Icone = iconesNavegacao[tab.id];
                  const ativo = separador === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={`app-nav-item${ativo ? ' ativa' : ''}`}
                      onClick={() => setSeparador(tab.id)}
                      aria-current={ativo ? 'page' : undefined}
                    >
                      <Icone style={{ margin: 0, verticalAlign: 'middle' }} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="app-sidebar-user">
            <span className="app-user-avatar">
              {utilizador.fotoPerfilUrl
                ? <img src={absolutaUrl(utilizador.fotoPerfilUrl)} alt="" />
                : <IconUser style={{ margin: 0, verticalAlign: 'middle' }} />}
            </span>
            <span className="app-user-copy">
              <strong>{utilizador.nome}</strong>
              <small>{utilizador.perfil}</small>
            </span>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <div>
              <span className="app-breadcrumb">Oficina John e Filhos</span>
              <h1>{paginaAtual?.label ?? 'Painel'}</h1>
            </div>
            <div className="app-topbar-actions">
              <span className="app-topbar-user">
                {utilizador.fotoPerfilUrl
                  ? <img src={absolutaUrl(utilizador.fotoPerfilUrl)} alt="" />
                  : <IconUser style={{ margin: 0, verticalAlign: 'middle' }} />}
                {utilizador.nome}
              </span>
              <SinoNotificacoes />
              <button type="button" className="app-topbar-logout" onClick={aoSair}>
                Sair
              </button>
            </div>
          </header>

          {/* ErrorBoundary keeps the navigation available if a page fails. */}
          <main className="conteudo">
            <ErrorBoundary>
              {separador === 'dashboard' && (
                <Dashboard
                  utilizador={utilizador}
                  irParaOrdens={() =>
                    setSeparador(isMecanico ? 'mecanico' : 'ordens')
                  }
                />
              )}
              {separador === 'mapa' && <Mapa utilizador={utilizador} />}
              {separador === 'perfil' && (
                <Perfil
                  utilizador={utilizador}
                  aoAtualizar={setUtilizador}
                  exigirNovoLogin={exigirNovoLogin}
                />
              )}
              {separador === 'catalogo' && <Catalogo />}
              {separador === 'avaliacoes' && <Avaliacoes perfil={utilizador.perfil} />}
              {separador === 'assistente' && <Assistente utilizador={utilizador} />}
              {separador === 'veiculos' && <Veiculos />}
              {separador === 'gestao' && <GestaoServicos />}
              {separador === 'pecas' && <Pecas />}
              {separador === 'orcamentos' && (
                <Orcamentos perfil={utilizador.perfil} />
              )}
              {separador === 'ordens' && <Ordens perfil={utilizador.perfil} />}
              {separador === 'agenda' && <Agendamentos />}
              {separador === 'mecanico' && <Mecanico />}
              {separador === 'precificacao' && <Precificacao />}
              {separador === 'atendimento' && <AtendimentoChat utilizador={utilizador} />}
              {separador === 'admin' && <Admin />}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </FeedbackProvider>
  );
}