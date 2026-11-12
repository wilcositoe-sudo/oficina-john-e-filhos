import { useState } from 'react';
import { absolutaUrl, api } from '../lib/api.js';

export default function Perfil({ utilizador, aoAtualizar, exigirNovoLogin }) {
  const [nome, setNome] = useState(utilizador.nome ?? '');
  const [email, setEmail] = useState(utilizador.email ?? '');
  const [telefone, setTelefone] = useState(utilizador.telefone ?? '');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aAlterarSenha, setAAlterarSenha] = useState(false);
  const [aGuardarFoto, setAGuardarFoto] = useState(false);

  async function guardarPerfil(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    setAGuardar(true);
    try {
      const atualizado = await api('PATCH', '/auth/me', {
        body: { nome, email: email.trim() || null, telefone: telefone.trim() || null },
      });
      aoAtualizar(atualizado);
      setMensagem('Perfil atualizado.');
    } catch (error) {
      setErro(error.message || 'Não foi possível atualizar o perfil.');
    } finally {
      setAGuardar(false);
    }
  }

  async function guardarFoto(event) {
    const foto = event.target.files?.[0];
    event.target.value = '';
    if (!foto) return;

    setErro('');
    setMensagem('');
    setAGuardarFoto(true);
    try {
      const body = new FormData();
      body.append('foto', foto);
      const atualizado = await api('POST', '/auth/me/foto', { body });
      aoAtualizar(atualizado);
      setMensagem('Fotografia de perfil atualizada.');
    } catch (error) {
      setErro(error.message || 'Não foi possível atualizar a fotografia.');
    } finally {
      setAGuardarFoto(false);
    }
  }

  async function removerFoto() {
    setErro('');
    setMensagem('');
    setAGuardarFoto(true);
    try {
      const atualizado = await api('DELETE', '/auth/me/foto');
      aoAtualizar(atualizado);
      setMensagem('Fotografia de perfil removida.');
    } catch (error) {
      setErro(error.message || 'Não foi possível remover a fotografia.');
    } finally {
      setAGuardarFoto(false);
    }
  }

  async function alterarSenha(event) {
    event.preventDefault();
    setErro('');
    setMensagem('');
    if (novaSenha !== confirmarSenha) {
      setErro('As palavras-passe não coincidem.');
      return;
    }

    setAAlterarSenha(true);
    try {
      await api('PATCH', '/auth/me/password', {
        body: { senhaAtual, novaSenha },
      });
      exigirNovoLogin();
    } catch (error) {
      setErro(error.message || 'Não foi possível alterar a palavra-passe.');
    } finally {
      setAAlterarSenha(false);
    }
  }

  return (
    <section className="perfil-page">
      <h2>O meu perfil</h2>
      <p className="subtitulo">Atualize os seus dados de contacto e segurança da conta.</p>

      <div className="cartao perfil-foto-cartao">
        <div className="perfil-foto-preview">
          {utilizador.fotoPerfilUrl ? (
            <img src={absolutaUrl(utilizador.fotoPerfilUrl)} alt={`Fotografia de ${utilizador.nome}`} />
          ) : (
            <span aria-hidden="true">{utilizador.nome?.trim()?.[0]?.toUpperCase() ?? '?'}</span>
          )}
        </div>
        <div className="perfil-foto-info">
          <h3>Fotografia de perfil</h3>
          <p>JPG, PNG ou WEBP, até 5 MB.</p>
          <label className="botao botao-secundario perfil-foto-escolher" htmlFor="perfil-foto">
            {aGuardarFoto ? 'A atualizar…' : 'Escolher fotografia'}
          </label>
          <input
            id="perfil-foto"
            className="perfil-foto-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={guardarFoto}
            disabled={aGuardarFoto}
          />
          {utilizador.fotoPerfilUrl && (
            <button type="button" className="botao botao-perigo" onClick={removerFoto} disabled={aGuardarFoto}>
              Remover fotografia
            </button>
          )}
        </div>
      </div>

      <div className="perfil-grid">
        <form className="cartao form-servico" onSubmit={guardarPerfil}>
          <h3>Dados da conta</h3>
          <label htmlFor="perfil-nome">Nome completo</label>
          <input
            id="perfil-nome"
            autoComplete="name"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            required
            minLength={2}
          />
          <label htmlFor="perfil-email">E-mail</label>
          <input
            id="perfil-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="perfil-telefone">Telefone</label>
          <input
            id="perfil-telefone"
            type="tel"
            autoComplete="tel"
            value={telefone}
            onChange={(event) => setTelefone(event.target.value)}
          />
          <label htmlFor="perfil-tipo">Perfil de acesso</label>
          <input id="perfil-tipo" value={utilizador.perfil} readOnly aria-readonly="true" />
          <button className="botao" type="submit" disabled={aGuardar}>
            {aGuardar ? 'A guardar…' : 'Guardar perfil'}
          </button>
        </form>

        <form className="cartao form-servico" onSubmit={alterarSenha}>
          <h3>Segurança</h3>
          <p className="hint">Ao alterar a palavra-passe, todas as sessões serão encerradas e terá de entrar novamente.</p>
          <label htmlFor="senha-atual">Palavra-passe atual</label>
          <input
            id="senha-atual"
            type="password"
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(event) => setSenhaAtual(event.target.value)}
            required
          />
          <label htmlFor="nova-senha">Nova palavra-passe (mín. 8)</label>
          <input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
            required
            minLength={8}
          />
          <label htmlFor="confirmar-senha">Confirmar nova palavra-passe</label>
          <input
            id="confirmar-senha"
            type="password"
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(event) => setConfirmarSenha(event.target.value)}
            required
            minLength={8}
          />
          <button className="botao" type="submit" disabled={aAlterarSenha}>
            {aAlterarSenha ? 'A atualizar…' : 'Alterar palavra-passe'}
          </button>
        </form>
      </div>

      {mensagem && <p className="info" role="status">{mensagem}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </section>
  );
}
