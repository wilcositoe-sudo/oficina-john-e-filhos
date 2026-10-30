import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function Catalogo() {
  const [servicos, setServicos] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api('GET', '/servicos', { auth: false })
      .then(setServicos)
      .catch((err) => setErro(err.message));
  }, []);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (servicos === null) return <p>A carregar serviços…</p>;
  if (servicos.length === 0) {
    return <p className="vazio">Sem serviços disponíveis de momento. Volte em breve.</p>;
  }

  return (
    <section>
      <h2>Serviços da oficina</h2>
      <div className="grelha">
        {servicos.map((s) => (
          <article className="cartao" key={s.id}>
            <h3>{s.nome}</h3>
            {s.descricao && <p>{s.descricao}</p>}
            <p className="preco">{Number(s.precoBase).toFixed(2)} MZN</p>
          </article>
        ))}
      </div>
    </section>
  );
}