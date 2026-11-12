import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { IconBell } from './icons.jsx';

const fmtHora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('pt-PT', { timeZone: 'Africa/Maputo', hour: '2-digit', minute: '2-digit' }) : '';

// O sino vive no HEADER, fora do ErrorBoundary que envolve o <main>.
// Por isso NÃO pode depender do boundary: trata erros internamente com
// degradação graciosa (badge 0 + ícone mudo) em vez de limpar a UI.
export default function SinoNotificacoes() {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState([]);
  const [erro, setErro] = useState('');
  const caixaRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      try {
        const l = await api('GET', '/notificacoes');
        if (vivo) { setLista(Array.isArray(l) ? l : []); setErro(''); }
      } catch (e) {
        if (vivo) setErro(e.message); // não rebenta; sino fica mudo
      }
    }
    carregar();
    const timer = setInterval(carregar, 8000);
    return () => { vivo = false; clearInterval(timer); };
  }, []);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function fora(ev) {
      if (caixaRef.current && !caixaRef.current.contains(ev.target)) setAberto(false);
    }
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  const naoLidas = lista.filter((n) => !n.lida).length;

  async function marcar(id) {
    setLista((ls) => ls.map((n) => (n.id === id ? { ...n, lida: true } : n))); // otimista
    try { await api('PATCH', `/notificacoes/${id}/lida`); } catch { /* já marcámos local */ }
  }

  async function marcarTodas() {
    setLista((ls) => ls.map((n) => ({ ...n, lida: true })));
    try { await api('PATCH', '/notificacoes/lidas-todas'); } catch { /* noop */ }
  }

  return (
    <div className="sino-caixa" ref={caixaRef} style={{ position: 'relative' }}>
      <button
        className="botao botao-secundario sino-botao"
        onClick={() => setAberto((a) => !a)}
        aria-label={`Notificações (${naoLidas} não lidas)`}
        aria-expanded={aberto}
      >
        <IconBell />
        {naoLidas > 0 && <span className="sino-badge">{naoLidas > 9 ? '9+' : naoLidas}</span>}
      </button>

      {aberto && (
        <div className="sino-dropdown cartao" role="menu">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong>Notificações</strong>
            {naoLidas > 0 && (
              <button className="botao botao-secundario" style={{ fontSize: '0.75rem', padding: '2px 8px' }} onClick={marcarTodas}>
                Marcar todas
              </button>
            )}
          </div>

          {erro && <p className="erro" role="alert" style={{ fontSize: '0.8rem' }}>Sem ligação às notificações.</p>}

          {lista.length === 0 && !erro ? (
            <p className="vazio" style={{ fontSize: '0.85rem' }}>Sem notificações.</p>
          ) : (
            <ul className="sino-lista">
              {lista.slice(0, 15).map((n) => (
                <li
                  key={n.id}
                  className={`sino-item ${n.lida ? '' : 'sino-nao-lida'}`}
                  onClick={() => marcar(n.id)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') marcar(n.id); }}
                >
                  <div className="sino-item-titulo">{n.titulo}</div>
                  {n.corpo && <div className="sino-item-corpo">{n.corpo}</div>}
                  <div className="sino-item-meta">
                    <small>{fmtHora(n.criadoAt ?? n.createdAt ?? n.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}