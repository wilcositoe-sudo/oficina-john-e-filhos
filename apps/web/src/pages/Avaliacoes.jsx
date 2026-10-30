import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmtData = (iso) =>
  new Date(iso).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' });

function Estrelas({ n }) {
  return <span className="estrelas" aria-label={`${n} de 5 estrelas`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// RF09 — avaliações públicas (sem dados privados dos autores)
export default function Avaliacoes() {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('GET', '/avaliacoes', { auth: false })
      .then(setLista)
      .catch((e) => setErro(e.message));
  }, []);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (lista === null) return <p>A carregar…</p>;

  return (
    <section>
      <h2>Avaliações dos clientes</h2>
      {lista.length === 0 ? (
        <p className="vazio">Ainda não há avaliações publicadas.</p>
      ) : (
        <div className="grelha">
          {lista.map((a) => (
            <article className="cartao" key={a.id}>
              <Estrelas n={a.classificacao} />
              {a.comentario && <p>{a.comentario}</p>}
              <p className="avaliacao-autor">
                <small>{a.clienteNome} · {fmtData(a.createdAt)}</small>
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}