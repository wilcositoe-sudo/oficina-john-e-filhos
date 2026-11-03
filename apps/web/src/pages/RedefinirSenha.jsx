import { useState } from 'react';
import { api } from '../lib/api.js';

export default function RedefinirSenha({ irParaLogin, tokenInicial }) {
  const [token, setToken] = useState(tokenInicial || '');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setErro(''); 
    setSucesso('');

    // NOVA VALIDAÇÃO: Impede que o e-mail seja enviado como token
    if (token.includes('@') || token.length < 20) {
      setErro('O campo deve conter o CÓDIGO de recuperação (sequência longa de letras/números), e NÃO o seu e-mail.');
      return;
    }

    if (senha !== confirmar) {
      setErro('As palavras-passe não coincidem.');
      return;
    }
    if (senha.length < 8) {
      setErro('A palavra-passe deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await api('POST', '/auth/reset-password', { 
        body: { token: token.trim(), novaSenha: senha }, 
        auth: false 
      });
      setSucesso('Senha redefinida com sucesso! Redirecionando...');
      setTimeout(irParaLogin, 2000);
    } catch (err) {
      setErro(err.message || 'Erro ao redefinir a senha. O token pode ter expirado ou ser inválido.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="centro">
      <form className="cartao cartao-login" onSubmit={submeter}>
        <h1>Redefinir Senha</h1>
        <p className="subtitulo">Crie uma nova palavra-passe para a sua conta.</p>
        
        {tokenInicial ? (
          // MODO AUTOMÁTICO: O campo nem aparece, impossibilitando erro
          <div style={{ 
            background: '#E2F0D9', 
            border: '1px solid #2E7D32', 
            borderRadius: 6, 
            padding: 12, 
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ fontSize: '1.2rem' }}>✅</span>
            <div>
              <strong style={{ color: '#1B5E20', fontSize: '0.9rem' }}>E-mail verificado automaticamente</strong>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#2E7D32', wordBreak: 'break-all' }}>
                O código de recuperação já foi aplicado pelo sistema.
              </p>
            </div>
          </div>
        ) : (
          // MODO MANUAL: Com aviso visual se o utilizador tentar colar o e-mail
          <>
            <label htmlFor="token">Código de recuperação</label>
            <input 
              id="token" 
              value={token} 
              onChange={(e) => setToken(e.target.value)} 
              required 
              placeholder="Cole AQUI o código longo (NÃO o e-mail)"
              style={{ borderColor: token.includes('@') ? '#B03A2E' : '#C9D4DD' }}
            />
            {token.includes('@') && (
              <p style={{ color: '#B03A2E', fontSize: '0.85rem', marginTop: 4, fontWeight: 600 }}>
                ⚠️ Parece que colou o e-mail. Precisa do código longo gerado pelo sistema.
              </p>
            )}
          </>
        )}
        
        <label htmlFor="senha">Nova palavra-passe (mín. 8 caracteres)</label>
        <input 
          id="senha" 
          type="password" 
          value={senha} 
          onChange={(e) => setSenha(e.target.value)} 
          required 
          minLength={8} 
        />
        
        <label htmlFor="confirmar">Confirmar nova palavra-passe</label>
        <input 
          id="confirmar" 
          type="password" 
          value={confirmar} 
          onChange={(e) => setConfirmar(e.target.value)} 
          required 
        />
        
        {erro && <p className="erro" role="alert">{erro}</p>}
        {sucesso && <p className="info" role="status" style={{ color: 'var(--destaque)', marginTop: 12, fontWeight: 600 }}>{sucesso}</p>}
        
        <button className="botao" type="submit" disabled={loading} style={{ marginTop: 16 }}>
          {loading ? 'A processar…' : 'Redefinir Senha'}
        </button>
        
        <button type="button" className="ligacao" onClick={irParaLogin} style={{ marginTop: 16, display: 'block', width: '100%', textAlign: 'center' }}>
          ← Voltar ao login
        </button>
      </form>
    </div>
  );
}