import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;
const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '';

function Estrelas({ n }) {
  return <span className="estrelas" aria-label={`${n} de 5 estrelas`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// Landing pública — apresenta a oficina antes do login.
// Cumpre RF01 (catálogo público) e RF09 (avaliações públicas).
export default function Landing({ irParaLogin, irParaRegisto }) {
  const [servicos, setServicos] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      api('GET', '/servicos', { auth: false }).catch(() => []),
      api('GET', '/avaliacoes', { auth: false }).catch(() => []),
    ])
      .then(([s, a]) => { setServicos(s); setAvaliacoes(a); })
      .catch((e) => setErro(e.message));
  }, []);

  return (
    <div className="landing">
      {/* HERO */}
      <header className="landing-hero">
        <nav className="landing-nav">
          <div className="landing-logo">
            <svg viewBox="0 0 64 64" width="36" height="36" aria-hidden="true">
              <circle cx="32" cy="32" r="30" fill="none" stroke="#087E8B" strokeWidth="3" />
              <path d="M20 44 L32 20 L44 44 M25 36 H39"
                stroke="#17365D" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong>Oficina John e Filhos</strong>
          </div>
          <div className="landing-nav-acoes">
            <button className="botao botao-secundario" onClick={irParaLogin}>Entrar</button>
            <button className="botao" onClick={irParaRegisto}>Criar conta</button>
          </div>
        </nav>

        <div className="hero-conteudo">
          <span className="hero-etiqueta">Moatize · Tete · Moçambique</span>
          <h1>Cuidamos do seu veículo<br />como se fosse nosso.</h1>
          <p className="hero-sub">
            Diagnóstico, reparação e manutenção com transparência.
            Peça orçamento, acompanhe a reparação em tempo real e pague em segurança.
          </p>
          <div className="hero-acoes">
            <button className="botao botao-grande" onClick={irParaRegisto}>Pedir orçamento</button>
            <a href="#servicos" className="botao botao-secundario botao-grande">Ver serviços</a>
          </div>
        </div>
      </header>

      {/* SOBRE */}
      <section className="landing-seccao" id="sobre">
        <h2>Sobre a oficina</h2>
        <p className="seccao-sub">
          Somos uma oficina familiar em Moatize, dedicada a oferecer um serviço mecânico
          de confiança. Combinamos experiência técnica com uma gestão moderna — para que
          saiba sempre o que está a ser feito no seu veículo e quanto vai custar.
        </p>
        <div className="grelha-3">
          <div className="cartao-destaque">
            <div className="cartao-icone">🔧</div>
            <h3>Diagnóstico rigoroso</h3>
            <p>Identificamos o problema antes de avançar, sem surpresas no final.</p>
          </div>
          <div className="cartao-destaque">
            <div className="cartao-icone">📱</div>
            <h3>Acompanhe online</h3>
            <p>Veja o estado da sua reparação, converse com a oficina e receba o recibo.</p>
          </div>
          <div className="cartao-destaque">
            <div className="cartao-icone">💳</div>
            <h3>Pagamento flexível</h3>
            <p>Presencial, cartão ou mobile money — com recibo emitido automaticamente.</p>
          </div>
        </div>
      </section>

      {/* CATÁLOGO — RF01 */}
      <section className="landing-seccao landing-seccao-alt" id="servicos">
        <h2>Os nossos serviços</h2>
        <p className="seccao-sub">Preços base indicativos. O valor final depende do diagnóstico.</p>
        {servicos === null ? (
          <p>A carregar serviços…</p>
        ) : servicos.length === 0 ? (
          <p className="vazio">Sem serviços disponíveis de momento.</p>
        ) : (
          <div className="grelha-servicos">
            {servicos.map((s) => (
              <article key={s.id} className="cartao-servico">
                <h3>{s.nome}</h3>
                {s.descricao && <p>{s.descricao}</p>}
                <p className="servico-preco">{fmtMoeda(s.precoBase)}</p>
              </article>
            ))}
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button className="botao botao-grande" onClick={irParaRegisto}>
            Pedir orçamento gratuito
          </button>
        </div>
      </section>

      {/* AVALIAÇÕES — RF09 */}
      <section className="landing-seccao" id="avaliacoes">
        <h2>O que dizem os nossos clientes</h2>
        {avaliacoes === null ? (
          <p>A carregar avaliações…</p>
        ) : avaliacoes.length === 0 ? (
          <p className="vazio">Seja o primeiro a avaliar após o seu serviço.</p>
        ) : (
          <div className="grelha-avaliacoes">
            {avaliacoes.slice(0, 6).map((a) => (
              <article key={a.id} className="cartao-avaliacao">
                <Estrelas n={a.classificacao} />
                {a.comentario && <p>"{a.comentario}"</p>}
                <small className="avaliacao-autor">— {a.clienteNome} · {fmtData(a.createdAt)}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CONTACTOS */}
      <section className="landing-seccao landing-seccao-alt" id="contactos">
        <h2>Visite-nos ou contacte-nos</h2>
        <div className="grelha-3">
          <div className="cartao-destaque">
            <h3>📍 Morada</h3>
            <p>Moatize<br />Província de Tete<br />Moçambique</p>
          </div>
          <div className="cartao-destaque">
            <h3>🕒 Horário</h3>
            <p>Segunda a Sexta: 08h–17h<br />Sábado: 08h–13h<br />Domingo: encerrado</p>
          </div>
          <div className="cartao-destaque">
            <h3>📞 Contactos</h3>
            <p>Telefone: +258 000 000 000<br />Email: geral@oficinajohn.co.mz</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="landing-cta">
        <h2>Pronto para cuidar do seu veículo?</h2>
        <p>Crie a sua conta em menos de 1 minuto e peça um orçamento.</p>
        <div className="hero-acoes">
          <button className="botao botao-grande botao-claro" onClick={irParaRegisto}>Criar conta</button>
          <button className="botao botao-secundario botao-grande botao-claro" onClick={irParaLogin}>Já tenho conta</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Oficina John e Filhos · Moatize, Moçambique</p>
      </footer>

      {erro && <p className="erro" style={{ position: 'fixed', bottom: 8, right: 8 }}>{erro}</p>}
    </div>
  );
}