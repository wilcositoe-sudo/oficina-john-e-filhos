import { useEffect, useState } from 'react';
import Login from './pages/Login.jsx';
import Catalogo from './pages/Catalogo.jsx';
import GestaoServicos from './pages/GestaoServicos.jsx';
import { api, getToken, setToken } from './lib/api.js';

export default function App() {
  const [utilizador, setUtilizador] = useState(null);
  const [aCarregar, setACarregar] = useState(!!getToken());
  const [separador, setSeparador] = useState('catalogo');

  useEffect(() => {
    if (!getToken()) return;
    api('GET', '/auth/me')
      .then(setUtilizador)
      .catch(() => setToken(null))
      .finally(() => setACarregar(false));
  }, []);

  function aoSair() {
    api('POST', '/auth/logout').catch(() => {});
    setToken(null);
    setUtilizador(null);
  }

  if (aCarregar) return <div className="centro">A carregar…</div>;
  if (!utilizador) return <Login aoEntrar={setUtilizador} />;

  // Doc 04 §4.3: ocultar na UI é só UX — o servidor impõe a autorização de qualquer forma
  const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);

  return (
    <div className="app">
      <header className="topo">
        <strong>Oficina John e Filhos</strong>
        <nav className="navegacao">
          <button className={separador === 'catalogo' ? 'aba ativa' : 'aba'}
            onClick={() => setSeparador('catalogo')}>Catálogo</button>
          {isStaff && (
            <button className={separador === 'gestao' ? 'aba ativa' : 'aba'}
              onClick={() => setSeparador('gestao')}>Gestão de serviços</button>
          )}
        </nav>
        <span className="topo-utilizador">{utilizador.nome} · {utilizador.perfil}</span>
        <button className="botao botao-secundario" onClick={aoSair}>Sair</button>
      </header>
      <main className="conteudo">
        {separador === 'catalogo' ? <Catalogo /> : <GestaoServicos />}
      </main>
    </div>
  );
}