import { IconStar, IconStarOutline } from './icons.jsx';

export default function Estrelas({ valor }) {
  const classificacao = Math.max(0, Math.min(5, Number(valor) || 0));

  return (
    <span className="estrelas" aria-label={`${classificacao} de 5 estrelas`} role="img">
      {Array.from({ length: 5 }, (_, index) => (
        index < classificacao
          ? <IconStar key={index} style={{ margin: 0 }} />
          : <IconStarOutline key={index} className="estrela-vazia" style={{ margin: 0 }} />
      ))}
    </span>
  );
}
