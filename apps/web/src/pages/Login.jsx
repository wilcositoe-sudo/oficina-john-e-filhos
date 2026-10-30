import { useState } from 'react';
import { api, setToken } from '../lib/api.js';

export default function Login({ aoEntrar }) {
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const data = await api('POST', '/auth/login', {
        body: { identificador, senha },
        auth: false,
      });
      setToken(data.token);
      aoEntrar(data.utilizador);
    } catch (err) {
      setErro(err.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centro">
      <form className="cartao cartao-login" onSubmit={submeter}>
        <h1>Oficina John e Filhos</h1>
        <p className="subtitulo">Gestão de Ordens de Serviço</p>

        <label htmlFor="identificador">E-mail ou telefone</label>
        <input
          id="identificador"
          type="text"
          autoComplete="username"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          required
        />

        <label htmlFor="senha">Palavra-passe</label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button className="botao" type="submit" disabled={loading}>
          {loading ? 'A entrar…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}