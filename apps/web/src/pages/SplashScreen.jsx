import { useEffect, useState } from 'react';

// Splash inicial — aparece só na primeira carga da sessão (~2s).
// Design sóbrio, profissional, alinhado com a identidade proposta (Doc 07).
export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1600);
    const t2 = setTimeout(() => onDone?.(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${fade ? 'splash-fade' : ''}`}>
      <div className="splash-conteudo">
        <div className="splash-logo">
          <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="none" stroke="#087E8B" strokeWidth="3" />
            <path d="M20 44 L32 20 L44 44 M25 36 H39"
              stroke="#17365D" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="splash-titulo">Oficina John e Filhos</h1>
        <p className="splash-sub">Gestão inteligente de reparações</p>
        <div className="splash-loader"><span /></div>
      </div>
    </div>
  );
}