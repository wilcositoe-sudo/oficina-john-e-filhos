import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import FormularioAvaliacaoOS from '../components/FormularioAvaliacaoOS.jsx';
import Estrelas from '../components/Estrelas.jsx';

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '';

// RF09 — Avaliações públicas (sem dados privados dos autores)
export default function Avaliacoes({ perfil }) {
  const [lista, setLista] = useState(null);
  const [ordens, setOrdens] = useState(perfil === 'CLIENTE' ? null : []);
  const [erro, setErro] = useState('');
  const [erroOrdens, setErroOrdens] = useState('');

  useEffect(() => {
    let ativa = true;
    api('GET', '/avaliacoes', { auth: false })
      .then((resultado) => { if (ativa) setLista(resultado); })
      .catch((e) => { if (ativa) setErro(e.message); });

    if (perfil === 'CLIENTE') {
      api('GET', '/ordens/meu')
        .then((resultado) => { if (ativa) setOrdens(resultado); })
        .catch((e) => { if (ativa) setErroOrdens(e.message); });
    }

    return () => { ativa = false; };
  }, [perfil]);

  const ordensEntregues = (ordens ?? []).filter((os) => os.estado === 'ENTREGUE');

  return (
    <section>
      <h2>Avaliações dos nossos clientes</h2>
      {perfil === 'CLIENTE' && (
        <section className="avaliacoes-cliente" aria-labelledby="avaliar-servico-titulo">
          <div className="avaliacoes-cliente-intro">
            <div>
              <span className="landing-section-kicker">A sua opinião conta</span>
              <h3 id="avaliar-servico-titulo">Avalie um serviço concluído</h3>
              <p>Escolha uma classificação de 1 a 5 estrelas e ajude-nos a melhorar.</p>
            </div>
          </div>
          {erroOrdens ? (
            <div>
              <p className="erro" role="alert">Não foi possível carregar as suas ordens: {erroOrdens}</p>
              <button
                type="button"
                className="botao botao-secundario"
                onClick={() => {
                  setErroOrdens('');
                  setOrdens(null);
                  api('GET', '/ordens/meu')
                    .then(setOrdens)
                    .catch((e) => setErroOrdens(e.message));
                }}
              >
                Tentar novamente
              </button>
            </div>
          ) : ordens === null ? (
            <p className="centro" role="status">A procurar serviços entregues…</p>
          ) : ordensEntregues.length === 0 ? (
            <p className="vazio">As avaliações ficam disponíveis depois da entrega do veículo.</p>
          ) : (
            <div className="avaliacoes-pendentes">
              {ordensEntregues.map((os) => (
                <article className="avaliacao-pendente cartao" key={os.id}>
                  <div className="avaliacao-pendente-cabecalho">
                    <div>
                      <strong>{os.numeroOS}</strong>
                      <small>Entregue em {fmtData(os.dataConclusao ?? os.createdAt)}</small>
                    </div>
                    <span className="badge badge-aprovado">Concluída</span>
                  </div>
                  <FormularioAvaliacaoOS os={os} />
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <h3 className="avaliacoes-publicas-titulo">Experiências partilhadas</h3>
      {erro ? (
        <p className="erro" role="alert">Não foi possível carregar as avaliações públicas: {erro}</p>
      ) : lista === null ? (
        <p className="centro" role="status">A carregar avaliações…</p>
      ) : lista.length === 0 ? (
        <p className="vazio">Ainda não há avaliações publicadas. Seja o primeiro!</p>
      ) : (
        <div className="grelha-avaliacoes">
          {lista.map((a) => (
            <article className="cartao cartao-avaliacao" key={a.id}>
              <Estrelas valor={a.classificacao} />
              {a.comentario && <p className="avaliacao-comentario">"{a.comentario}"</p>}
              <p className="avaliacao-autor">
                <small>— {a.clienteNome} · {fmtData(a.createdAt)}</small>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}