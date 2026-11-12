import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

const fmtHora = (iso) => iso
  ? new Date(iso).toLocaleTimeString('pt-PT', {
      timeZone: 'Africa/Maputo',
      hour: '2-digit',
      minute: '2-digit',
    })
  : '';

export default function ChatOS({ ordemId, titulo, perfil = 'CLIENTE', aoAtualizar }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const containerRef = useRef(null);
  const aoAtualizarRef = useRef(aoAtualizar);
  useEffect(() => {
    aoAtualizarRef.current = aoAtualizar;
  }, [aoAtualizar]);

  useEffect(() => {
    let ativo = true;
    let carregando = false;

    async function carregar() {
      if (carregando || document.visibilityState !== 'visible') return;
      carregando = true;
      try {
        const resultado = await api('GET', `/ordens/${ordemId}/mensagens`);
        if (ativo) {
          setMensagens(resultado);
          setErro('');
          aoAtualizarRef.current?.();
        }
      } catch (error) {
        if (ativo) setErro(error.message);
      } finally {
        carregando = false;
      }
    }

    void carregar();
    const timer = window.setInterval(() => void carregar(), 2500);
    const aoFocar = () => void carregar();
    window.addEventListener('focus', aoFocar);
    document.addEventListener('visibilitychange', aoFocar);
    return () => {
      ativo = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', aoFocar);
      document.removeEventListener('visibilitychange', aoFocar);
    };
  }, [ordemId]);

  useEffect(() => {
    const caixa = containerRef.current;
    if (caixa) caixa.scrollTop = caixa.scrollHeight;
  }, [mensagens]);

  async function enviar(event) {
    event.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || aEnviar) return;

    setErro('');
    setAEnviar(true);
    try {
      await api('POST', `/ordens/${ordemId}/mensagens`, { body: { conteudo } });
      setTexto('');
      const resultado = await api('GET', `/ordens/${ordemId}/mensagens`);
      setMensagens(resultado);
      aoAtualizarRef.current?.();
    } catch (error) {
      setErro(error.message);
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <div className="cartao chat-os">
      <header className="chat-os-cabecalho">
        <div>
          <span className="landing-section-kicker">Conversa da ordem</span>
          <h3>{titulo || 'Conversa com a oficina'}</h3>
        </div>
        <span className="chat-os-ao-vivo"><i /> Atualização automática</span>
      </header>
      <div
        className="chat-mensagens chat-os-mensagens"
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Mensagens da ordem de serviço"
      >
        {mensagens.length === 0 && (
          <p className="vazio">Ainda não há mensagens. Escreve para iniciar a conversa.</p>
        )}
        {mensagens.map((mensagem) => {
          const sistema = mensagem.tipo === 'SISTEMA' || mensagem.remetentePerfil === 'SISTEMA';
          const proprio = perfil === 'CLIENTE'
            ? mensagem.remetentePerfil === 'CLIENTE'
            : ['FUNCIONARIO', 'ADMINISTRADOR', 'MECANICO'].includes(mensagem.remetentePerfil);
          return (
            <div
              key={mensagem.id}
              className={`chat-linha ${sistema ? 'chat-sistema' : proprio ? 'chat-cliente' : 'chat-staff'}`}
            >
              <div className="chat-bolha">
                <small>{sistema ? 'Atualização da OS' : mensagem.remetenteNome} · {fmtHora(mensagem.enviadoAt)}</small>
                <p style={{ whiteSpace: 'pre-wrap' }}>{mensagem.conteudo}</p>
              </div>
            </div>
          );
        })}
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <form className="linha-row chat-input-row" onSubmit={enviar}>
        <input
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Escreve uma mensagem…"
          maxLength={2000}
          disabled={aEnviar}
        />
        <button className="botao" type="submit" disabled={aEnviar || !texto.trim()} aria-busy={aEnviar}>
          {aEnviar ? 'A enviar…' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
