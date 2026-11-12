import { useState } from 'react';
import { api } from '../lib/api.js';

export default function RecuperarSenha({ irParaLogin, irParaRedefinirComToken }) {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro('');
    setSucesso(false);
    setLoading(true);

    try {
      const resultado = await api('POST', '/auth/forgot-password', {
        body: { email },
        auth: false,
      });

      if (resultado && resultado.tokenDeTeste) {
        irParaRedefinirComToken(resultado.tokenDeTeste);
      } else {
        setSucesso(true);
      }
    } catch (err) {
      setErro(err.message || 'Erro ao processar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  if (sucesso) {
    return (
      <div className="centro">
        <div className="cartao cartao-login" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
          <h1>Verifique o seu e-mail</h1>
          <p className="subtitulo">
            Se este e-mail estiver registado, receberá as instruções de recuperação.
          </p>
          <button className="botao botao-secundario" onClick={irParaLogin} style={{ marginTop: 24, width: '100%' }}>
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="centro">
      <form className="cartao cartao-login" onSubmit={submeter}>
        <h1>Recuperar Senha</h1>
        <p className="subtitulo">Insira o seu e-mail para redefinir a sua palavra-passe.</p>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="exemplo@dominio.com"
        />

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button className="botao" type="submit" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'A verificar…' : 'Continuar'}
        </button>

        <button type="button" className="ligacao" onClick={irParaLogin} style={{ marginTop: 16, display: 'block', width: '100%', textAlign: 'center' }}>
          ← Voltar ao login
        </button>
      </form>
    </div>
  );
}