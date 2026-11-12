import { useState } from 'react';
import { api, setToken } from '../lib/api.js';
import LogoOficina from '../components/LogoOficina.jsx';

export default function Login({ aoEntrar, irParaRegisto, irParaLanding, irParaRecuperar }) {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function submeter(event) {
    event.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const data = await api('POST', '/auth/login', {
        body: { identificador, senha },
        auth: false,
      });
      setToken(data.token);
      aoEntrar(data.utilizador);
    } catch (error) {
      setErro(error.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-workshop-page auth-static-page">
      <section className="auth-workshop-photo" aria-label="Fotografia de manutenção automóvel">
        <header className="auth-workshop-brand">
          <LogoOficina />
        </header>
        <div className="auth-workshop-intro">
          <span className="auth-workshop-kicker">Precisão em cada detalhe</span>
          <h1>O seu veículo, cuidado por quem entende.</h1>
          <p>Acompanhe o diagnóstico, a reparação e cada etapa do serviço num só lugar.</p>
        </div>
      </section>
      <section className="auth-workshop-panel">
        <form className="auth-workshop-form" onSubmit={submeter}>
          <span className="auth-workshop-kicker">Bem-vindo de volta</span>
          <h2>Entrar na sua conta</h2>
          <p className="auth-workshop-form-subtitle">Aceda à gestão das suas ordens de serviço.</p>

          {irParaLanding && (
            <button type="button" className="auth-workshop-link auth-workshop-back" onClick={irParaLanding}>
              ← Voltar à página inicial
            </button>
          )}

          <label htmlFor="identificador">E-mail ou telefone</label>
          <input
            id="identificador"
            type="text"
            autoComplete="username"
            value={identificador}
            onChange={(event) => setIdentificador(event.target.value)}
            required
          />

          <label htmlFor="senha">Palavra-passe</label>
          <div className="auth-password-field">
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((current) => !current)}
              aria-label={mostrarSenha ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
            >
              {mostrarSenha ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          {erro && <p className="erro auth-workshop-error" role="alert">{erro}</p>}

          <button className="botao" type="submit" disabled={loading}>
            {loading ? 'A validar acesso…' : 'Entrar'}
          </button>

          <button type="button" className="auth-workshop-link auth-workshop-recovery" onClick={irParaRecuperar}>
            Esqueceu a sua palavra-passe?
          </button>

          <div className="auth-workshop-form-footer">
            <span>Ainda não tem conta?</span>
            <button type="button" className="auth-workshop-link" onClick={irParaRegisto}>
              Criar conta
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
