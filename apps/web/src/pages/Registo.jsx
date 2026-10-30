import { useState } from 'react';
import { api, setToken } from '../lib/api.js';

// UI02/RF20: registo público de cliente. Após criar conta, entra logo com sessão.
export default function Registo({ aoEntrar, irParaLogin }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function submeter(e) {
    e.preventDefault();
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
      // Registo bem-sucedido → login automático (mesmo contrato do Login)
      const data = await api('POST', '/auth/login', {
        body: { identificador: email, senha },
        auth: false,
      });
      setToken(data.token);
      aoEntrar(data.utilizador);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centro">
      <form className="cartao cartao-login" onSubmit={submeter}>
        <h1>Criar conta</h1>
        <p className="subtitulo">Cliente — Oficina John e Filhos</p>

        <label htmlFor="nome">Nome completo</label>
        <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />

        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label htmlFor="senha">Palavra-passe (mín. 8)</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} />

        <label htmlFor="confirmar">Confirmar palavra-passe</label>
        <input id="confirmar" type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required />

        {erro && <p className="erro" role="alert">{erro}</p>}

        <button className="botao" type="submit" disabled={loading}>
          {loading ? 'A criar conta…' : 'Registar'}
        </button>
        <button type="button" className="ligacao" onClick={irParaLogin}>
          Já tenho conta — entrar
        </button>
      </form>
    </div>
  );
}