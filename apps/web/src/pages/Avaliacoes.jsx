import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtData = (iso) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' }) : '';

function Estrelas({ n }) {
  return (
    <span className="estrelas" aria-label={`${n} de 5 estrelas`}>
      {'★'.repeat(n)}{'☆'.repeat(5 - n)}
    </span>
  );
}

// RF09 — Avaliações públicas (sem dados privados dos autores)
export default function Avaliacoes() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('GET', '/avaliacoes', { auth: false })
      .then(setLista)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (lista === null) return <p className="centro">A carregar avaliações…</p>;

  return (
    <section>
      <h2>Avaliações dos nossos clientes</h2>
      {lista.length === 0 ? (
        <p className="vazio">Ainda não há avaliações publicadas. Seja o primeiro!</p>
      ) : (
        <div className="grelha-avaliacoes">
          {lista.map((a) => (
            <article className="cartao cartao-avaliacao" key={a.id}>
              <Estrelas n={a.classificacao} />
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