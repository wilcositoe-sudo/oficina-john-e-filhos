import { useEffect, useState } from 'react';
import LogoOficina from '../components/LogoOficina.jsx';

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1300);
    const t2 = setTimeout(() => onDone?.(), 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash ${fade ? 'splash-fade' : ''}`} role="status" aria-live="polite">
      <div className="splash-conteudo">
        <LogoOficina className="splash-logo-oficina" />
        <span className="splash-kicker">MOATIZE · MOÇAMBIQUE</span>
        <p className="splash-sub">Tecnologia, confiança e cuidado em cada serviço.</p>
        <div className="splash-loading">
          <span>A preparar a sua oficina digital</span>
        </div>
      </div>
    </div>
  );
}