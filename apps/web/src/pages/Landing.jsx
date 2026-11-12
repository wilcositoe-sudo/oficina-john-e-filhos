import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import Estrelas from '../components/Estrelas.jsx';

const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} MZN`;
const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '';

const IMAGENS_SERVICOS = [
  'photo-1486262715619-67b85e0b08d3',
  'photo-1632823471565-1ecdf5c7e9c9',
  'photo-1487754180451-c456f719a1fc',
  'photo-1471478331149-7c403f3c35c9',
  'photo-1503376780353-7e6692767b70',
  'photo-1493238792000-8113da705763',
];

const IMAGENS_OFICINA = [
  {
    src: 'photo-1489824904134-891ab64532f1',
    alt: 'Técnico a trabalhar num veículo numa oficina',
    classe: 'landing-gallery-wide',
  },
  {
    src: 'photo-1517524206127-48bbd363f3d7',
    alt: 'Detalhe de um automóvel em manutenção',
    classe: '',
  },
  {
    src: 'photo-1519641471654-76ce0107ad1b',
    alt: 'Equipamento de diagnóstico automóvel',
    classe: '',
  },
];

function urlImagem(id, largura = 900) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${largura}&q=80`;
}

// Landing pública — apresenta a oficina antes do login.
// Cumpre RF01 (catálogo público) e RF09 (avaliações públicas).
export default function Landing({ irParaLogin, irParaRegisto }) {
  const [servicos, setServicos] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState(null);
  const [erroServicos, setErroServicos] = useState('');
  const [erroAvaliacoes, setErroAvaliacoes] = useState('');
  const [servicoSelecionado, setServicoSelecionado] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.allSettled([
      api('GET', '/servicos', { auth: false }),
      api('GET', '/avaliacoes', { auth: false }),
    ]).then(([resultadoServicos, resultadoAvaliacoes]) => {
      if (!ativo) return;

      if (resultadoServicos.status === 'fulfilled') {
        setServicos(resultadoServicos.value);
      } else {
        setErroServicos(resultadoServicos.reason?.message ?? String(resultadoServicos.reason));
      }

      if (resultadoAvaliacoes.status === 'fulfilled') {
        setAvaliacoes(resultadoAvaliacoes.value);
      } else {
        setErroAvaliacoes(resultadoAvaliacoes.reason?.message ?? String(resultadoAvaliacoes.reason));
      }
    });

    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!servicoSelecionado) return undefined;
    const aoTeclar = (event) => {
      if (event.key === 'Escape') setServicoSelecionado(null);
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [servicoSelecionado]);

  return (
    <div className="landing">
      {/* HERO */}
      <header className="landing-hero">
        <img
          className="landing-hero-image"
          src={urlImagem('photo-1492144534655-ae79c964c9d7', 2000)}
          alt=""
          fetchPriority="high"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
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
          <h1>Excelência em cada reparação.</h1>
          <p className="hero-sub">
            Transformamos tecnologia, experiência e dedicação em confiança para o
            seu automóvel.
          </p>
          <div className="hero-acoes">
            <a href="#servicos" className="botao botao-grande">Explorar serviços</a>
            <a href="#oficina" className="botao botao-secundario botao-grande">Conhecer a oficina</a>
            <button className="botao botao-outline-light botao-grande" onClick={irParaRegisto}>
              Solicitar assistência
            </button>
          </div>
          <div className="landing-hero-proof">
            <span><strong>{servicos?.length ?? '—'}</strong> serviços disponíveis</span>
            <span className="landing-proof-divider" />
            <span><strong>{avaliacoes?.length ?? '—'}</strong> avaliações de clientes</span>
          </div>
        </div>
      </header>

      {/* SOBRE */}
      <section className="landing-about" id="oficina">
        <div className="landing-about-image">
          <img
            src={urlImagem('photo-1525609004556-c46c7d6cf023', 1200)}
            alt="Trabalho técnico numa oficina automóvel"
            loading="lazy"
            onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
          />
          <span className="landing-image-label">Cuidado técnico, em cada detalhe</span>
        </div>
        <div className="landing-about-copy">
          <span className="landing-section-kicker">A oficina</span>
          <h2>Confiança construída com experiência e transparência.</h2>
          <p>
            Somos uma oficina familiar em Moatize. Aliamos experiência mecânica a
            um acompanhamento claro para que saiba o que está a ser feito no seu
            veículo em cada etapa.
          </p>
          <div className="landing-about-points">
            <span><b>01</b> Diagnóstico acompanhado</span>
            <span><b>02</b> Orçamento antes da reparação</span>
            <span><b>03</b> Acompanhamento da ordem de serviço</span>
          </div>
          <button className="botao" onClick={irParaRegisto}>Solicitar assistência</button>
        </div>
      </section>

      {/* CATÁLOGO — RF01 */}
      <section className="landing-seccao landing-seccao-alt" id="servicos">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-kicker">Especialidades</span>
            <h2>Serviços para manter o seu veículo em movimento.</h2>
          </div>
          <p className="seccao-sub">Preços base indicativos. O valor final depende do diagnóstico.</p>
        </div>
        {servicos === null ? (
          erroServicos ? <p className="erro" role="alert">Não foi possível carregar os serviços: {erroServicos}</p> : <p>A carregar serviços…</p>
        ) : servicos.length === 0 ? (
          <p className="vazio">Sem serviços disponíveis de momento.</p>
        ) : (
          <div className="landing-services-grid">
            {servicos.map((s, index) => {
              const imagem = IMAGENS_SERVICOS[index];
              return (
              <article key={s.id} className="landing-service-card">
                <button
                  type="button"
                  className="landing-service-image"
                  onClick={() => setServicoSelecionado(s)}
                  aria-label={`Ver detalhes de ${s.nome}`}
                >
                  {imagem && (
                    <img
                      src={urlImagem(imagem, 900)}
                      alt=""
                      loading="lazy"
                      onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                    />
                  )}
                  <span className="landing-service-view">Ver serviço <span aria-hidden="true">↗</span></span>
                </button>
                <div className="landing-service-copy">
                  <span className="landing-service-index">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{s.nome}</h3>
                  {s.descricao && <p>{s.descricao}</p>}
                  <div className="landing-service-bottom">
                    <strong>{fmtMoeda(s.precoBase)}</strong>
                    <button type="button" className="ligacao" onClick={() => setServicoSelecionado(s)}>
                      Consultar detalhes
                    </button>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
        <div className="landing-section-cta">
          <span>Precisa de ajuda com o seu automóvel?</span>
          <button className="botao" onClick={irParaRegisto}>Pedir assistência</button>
        </div>
      </section>

      <section className="landing-gallery" aria-labelledby="gallery-title">
        <div className="landing-section-heading">
          <div>
            <span className="landing-section-kicker">Precisão em cada etapa</span>
            <h2 id="gallery-title">Conhecimento técnico. Cuidado próximo.</h2>
          </div>
          <p className="seccao-sub">
            Uma oficina preparada para acompanhar o seu veículo do diagnóstico à conclusão.
          </p>
        </div>
        <div className="landing-gallery-grid">
          {IMAGENS_OFICINA.map((imagem) => (
            <figure className={imagem.classe} key={imagem.src}>
              <img
                src={urlImagem(imagem.src, 1100)}
                alt={imagem.alt}
                loading="lazy"
                onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
              />
            </figure>
          ))}
        </div>
      </section>

      {/* AVALIAÇÕES — RF09 */}
      <section className="landing-seccao" id="avaliacoes">
        <span className="landing-section-kicker">Experiência dos clientes</span>
        <h2>O que dizem os nossos clientes</h2>
        {avaliacoes === null ? (
          erroAvaliacoes ? <p className="erro" role="alert">Não foi possível carregar as avaliações: {erroAvaliacoes}</p> : <p>A carregar avaliações…</p>
        ) : avaliacoes.length === 0 ? (
          <p className="vazio">Seja o primeiro a avaliar após o seu serviço.</p>
        ) : (
          <div className="grelha-avaliacoes">
            {avaliacoes.slice(0, 6).map((a) => (
              <article key={a.id} className="cartao-avaliacao">
                <Estrelas valor={a.classificacao} />
                {a.comentario && <p>"{a.comentario}"</p>}
                <small className="avaliacao-autor">— {a.clienteNome} · {fmtData(a.createdAt)}</small>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* CONTACTOS */}
      <section className="landing-seccao landing-seccao-alt" id="contactos">
        <span className="landing-section-kicker">Estamos por perto</span>
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

      {servicoSelecionado && (
        <div
          className="landing-service-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setServicoSelecionado(null);
          }}
        >
          <section className="landing-service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title">
            <button
              type="button"
              className="landing-modal-close"
              onClick={() => setServicoSelecionado(null)}
              aria-label="Fechar detalhes"
            >
              ×
            </button>
            {IMAGENS_SERVICOS[servicos?.findIndex((item) => item.id === servicoSelecionado.id)] && (
              <img
                src={urlImagem(IMAGENS_SERVICOS[servicos.findIndex((item) => item.id === servicoSelecionado.id)], 1200)}
                alt=""
                onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
              />
            )}
            <div>
              <span className="landing-section-kicker">Serviço da oficina</span>
              <h2 id="service-modal-title">{servicoSelecionado.nome}</h2>
              {servicoSelecionado.descricao && <p>{servicoSelecionado.descricao}</p>}
              <strong className="landing-modal-price">{fmtMoeda(servicoSelecionado.precoBase)}</strong>
              <button
                type="button"
                className="botao"
                onClick={() => {
                  setServicoSelecionado(null);
                  irParaRegisto();
                }}
              >
                Solicitar assistência
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}