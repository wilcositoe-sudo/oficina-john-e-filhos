import { useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from './Feedback.jsx';
import { IconStar, IconStarOutline } from './icons.jsx';

export default function FormularioAvaliacaoOS({ os }) {
  const feedback = useFeedback();
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState('');
  const [estado, setEstado] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const comentarioId = `comentario-avaliacao-${os.id}`;

  async function submeter(event) {
    event.preventDefault();
    if (aEnviar) return;
    setAEnviar(true);
    try {
      await api('POST', `/ordens/${os.id}/avaliacoes`, {
        body: { classificacao: nota, comentario },
      });
      setEstado('ok');
    } catch (error) {
      if (error.message?.includes('AVALIACAO_EXISTENTE') || error.code === 'AVALIACAO_EXISTENTE') {
        setEstado('ja-avaliada');
      } else {
        feedback.mostrarErro('Não foi possível enviar a avaliação', error.message);
      }
    } finally {
      setAEnviar(false);
    }
  }

  if (estado === 'ok') {
    return <p className="info avaliacao-enviada" role="status">Obrigado pela sua avaliação!</p>;
  }
  if (estado === 'ja-avaliada') {
    return <p className="vazio avaliacao-enviada" role="status">Já avaliou esta ordem de serviço.</p>;
  }

  return (
    <div className="cartao avaliacao-form-cartao">
      <h3>Avaliar o serviço</h3>
      <form className="form-servico avaliacao-form" onSubmit={submeter}>
        <div className="avaliacao-nota">
          <span>Como foi o serviço?</span>
          <div className="estrelas-input" role="radiogroup" aria-label="Classificação de 1 a 5 estrelas">
            {[1, 2, 3, 4, 5].map((valor) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={nota === valor}
                className={`estrela ${valor <= nota ? 'ativa' : ''}`}
                onClick={() => setNota(valor)}
                disabled={aEnviar}
                title={`${valor} ${valor === 1 ? 'estrela' : 'estrelas'}`}
              >
                {valor <= nota ? <IconStar /> : <IconStarOutline />}
                <span className="sr-only">{valor} {valor === 1 ? 'estrela' : 'estrelas'}</span>
              </button>
            ))}
          </div>
        </div>
        <label htmlFor={comentarioId}>Comentário (opcional)</label>
        <textarea
          id={comentarioId}
          rows="3"
          maxLength={1000}
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          disabled={aEnviar}
          placeholder="Conte-nos como foi a sua experiência."
        />
        <button className="botao" type="submit" disabled={aEnviar} aria-busy={aEnviar}>
          {aEnviar ? 'A enviar…' : 'Enviar avaliação'}
        </button>
      </form>
    </div>
  );
}
