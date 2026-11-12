import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import AuthSceneLoadBoundary from '../components/AuthSceneLoadBoundary.jsx';
import { useReducedMotion } from '../hooks/use-reduced-motion.js';
import { api } from '../lib/api.js';

const AuthWorkshopScene = lazy(() => import('../components/AuthWorkshopScene.jsx'));

export default function Registo({ irParaLogin }) {
  const reducedMotion = useReducedMotion();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [sceneStage, setSceneStage] = useState(() => (reducedMotion ? 'ready' : 'intro'));
  const timerLogin = useRef(null);
  const timerErro = useRef(null);
  const registrationProgress = [
    nome.trim().length >= 2,
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    senha.length >= 8,
    confirmar.length > 0 && senha === confirmar,
  ].filter(Boolean).length;

  useEffect(() => () => {
    window.clearTimeout(timerLogin.current);
    window.clearTimeout(timerErro.current);
  }, []);

  async function submeter(event) {
    event.preventDefault();
    setErro('');
    if (senha !== confirmar) {
      setErro('As palavras-passe não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api('POST', '/auth/register', {
        body: { nome, email, senha },
        auth: false,
      });
      setSceneStage('registered');
      timerLogin.current = window.setTimeout(irParaLogin, reducedMotion ? 0 : 2400);
    } catch (error) {
      setErro(error.message || 'Não foi possível criar a conta.');
      setSceneStage('error');
      timerErro.current = window.setTimeout(
        () => setSceneStage('ready'),
        reducedMotion ? 0 : 1250,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-workshop-page auth-workshop-register">
      <AuthSceneLoadBoundary onSceneError={() => setSceneStage('ready')}>
        <Suspense fallback={<div className="auth-workshop-canvas auth-scene-loading" aria-hidden="true" />}>
          <AuthWorkshopScene
            stage={sceneStage}
            reducedMotion={reducedMotion}
            registrationProgress={registrationProgress}
            onIntroComplete={() => setSceneStage((stage) => (stage === 'intro' ? 'ready' : stage))}
          />
        </Suspense>
      </AuthSceneLoadBoundary>

      <header className="auth-workshop-brand">
        <button type="button" className="auth-workshop-brand-mark" onClick={irParaLogin} aria-label="Voltar ao login">
          JF
        </button>
        <div>
          <strong>JOHN &amp; FILHOS</strong>
          <span>Oficina · Moatize</span>
        </div>
      </header>

      <section className="auth-workshop-intro">
        <span className="auth-workshop-kicker">Um novo começo</span>
        <h1>Entre para a oficina.</h1>
        <p>Crie a sua conta e acompanhe o cuidado do seu veículo de perto.</p>
        <div className="auth-register-build" aria-live="polite">
          <span>Montagem do motor</span>
          <div role="img" aria-label={`${registrationProgress} de 4 componentes montados`}>
            {[0, 1, 2, 3].map((part) => (
              <i key={part} className={part < registrationProgress ? 'montado' : ''} />
            ))}
          </div>
        </div>
      </section>

      <section className="auth-workshop-panel" aria-live="polite">
        {sceneStage === 'intro' && (
          <div className="auth-workshop-wait">
            <span className="auth-workshop-kicker">A oficina está a preparar-se</span>
            <h2>Um momento.</h2>
            <p>Enquanto o mecânico prepara o motor, pode montar o seu acesso.</p>
            <button type="button" className="auth-workshop-secondary" onClick={() => setSceneStage('ready')}>
              Saltar animação
            </button>
          </div>
        )}

        {sceneStage === 'registered' && (
          <div className="auth-workshop-success">
            <span className="auth-workshop-success-mark" aria-hidden="true">✓</span>
            <span className="auth-workshop-kicker">Montagem concluída</span>
            <h2>A sua conta está criada.</h2>
            <p>Vamos levá-lo ao login para iniciar sessão.</p>
            <button type="button" className="botao" onClick={irParaLogin}>
              Ir para o login
            </button>
            <span className="auth-workshop-progress" aria-hidden="true" />
          </div>
        )}

        {(sceneStage === 'ready' || sceneStage === 'error') && (
          <form className="auth-workshop-form" onSubmit={submeter}>
            <span className="auth-workshop-kicker">Conta de cliente</span>
            <h2>Criar conta</h2>
            <p className="auth-workshop-form-subtitle">Preencha os dados para acompanhar os seus serviços.</p>

            <label htmlFor="registo-nome">Nome completo</label>
            <input
              id="registo-nome"
              autoComplete="name"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              minLength={2}
            />

            <label htmlFor="registo-email">E-mail</label>
            <input
              id="registo-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="registo-senha">Palavra-passe (mín. 8)</label>
            <input
              id="registo-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
              minLength={8}
            />

            <label htmlFor="registo-confirmar">Confirmar palavra-passe</label>
            <input
              id="registo-confirmar"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(event) => setConfirmar(event.target.value)}
              required
            />

            {erro && <p className="erro auth-workshop-error" role="alert">{erro}</p>}

            <button className="botao" type="submit" disabled={loading}>
              {loading ? 'A criar conta…' : 'Registar'}
            </button>
            <div className="auth-workshop-form-footer">
              <span>Já tem conta?</span>
              <button type="button" className="auth-workshop-link" onClick={irParaLogin}>
                Entrar
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
