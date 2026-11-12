import { useRef, useState } from 'react';
import { getToken, API_BASE, absolutaUrl } from '../lib/api.js';
import { useFeedback } from './Feedback.jsx';
import {
  IconPaperclip,
  IconCamera,
  IconVideo,
  IconImage,
  IconX,
  IconSpinner,
} from './icons.jsx';

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

function formatBytes(bytes) {
  return `${(Number(bytes ?? 0) / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CarregarEvidencias({
  ordemId,
  valor = [],
  onChange,
  maxArquivos = 10,
  maxMB = 25,
  disabled = false,
  titulo = 'Evidências',
  hint = 'Tira foto, grava vídeo ou escolhe do dispositivo.',
}) {
  const feedback = useFeedback();

  const fotoRef = useRef(null);
  const videoRef = useRef(null);
  const galeriaRef = useRef(null);

  const [aEnviar, setAEnviar] = useState(false);

  async function enviarFicheiro(file) {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${API_BASE}/ordens/${ordemId}/evidencias`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken() ?? ''}`,
      },
      body: form,
    });

    if (!res.ok) {
      const corpo = await res.json().catch(() => ({}));
      throw new Error(corpo?.erro?.mensagem || `Falha no upload (${res.status}).`);
    }

    const json = await res.json();
    return json.data;
  }

  async function processar(novosArquivos) {
    const lista = Array.from(novosArquivos ?? []);
    if (!lista.length) return;

    if (valor.length + lista.length > maxArquivos) {
      feedback.mostrarErro(
        'Limite de ficheiros',
        `Podes anexar no máximo ${maxArquivos} ficheiros.`,
      );
      return;
    }

    setAEnviar(true);

    const aceites = [];
    const erros = [];

    for (const file of lista) {
      if (!TIPOS_PERMITIDOS.has(file.type)) {
        erros.push(`${file.name}: tipo não permitido.`);
        continue;
      }

      if (file.size > maxMB * 1024 * 1024) {
        erros.push(`${file.name}: excede ${maxMB} MB.`);
        continue;
      }

      try {
        const gravado = await enviarFicheiro(file);

        aceites.push({
          id: gravado.id,
          ordemId: gravado.ordemId,
          tipo: gravado.tipo ?? 'GERAL',
          referenciaId: gravado.referenciaId ?? null,
          url: gravado.url,
          mimeType: gravado.mimeType ?? file.type,
          tamanho: gravado.tamanho ?? file.size,
          legenda: gravado.legenda ?? '',
          criadoAt: gravado.criadoAt,
          previewUrl: absolutaUrl(gravado.url),
        });
      } catch (e) {
        erros.push(`${file.name}: ${e.message}`);
      }
    }

    if (erros.length) {
      feedback.mostrarErro('Alguns ficheiros falharam', erros.join('\n'));
    }

    if (aceites.length) {
      onChange([...valor, ...aceites]);
    }

    setAEnviar(false);
  }

  function remover(index) {
    onChange(valor.filter((_, i) => i !== index));
  }

  const bloqueado = disabled || aEnviar;
  const cheio = valor.length >= maxArquivos;

  return (
    <section className="cartao carregar-evidencias">
      <div className="evidencias-cabecalho">
        <div>
          <h3><IconPaperclip /> {titulo}</h3>
          <p className="hint">{hint}</p>
        </div>

        {valor.length > 0 && (
          <button
            type="button"
            className="botao botao-secundario"
            onClick={() => onChange([])}
            disabled={bloqueado}
            aria-busy={aEnviar}
          >
            Limpar tudo
          </button>
        )}
      </div>

      <div className="evidencias-acoes">
        <button
          type="button"
          className="botao"
          onClick={() => fotoRef.current?.click()}
          disabled={bloqueado || cheio}
          aria-busy={aEnviar}
        >
          <IconCamera /> Tirar foto
        </button>

        <button
          type="button"
          className="botao"
          onClick={() => videoRef.current?.click()}
          disabled={bloqueado || cheio}
          aria-busy={aEnviar}
        >
          <IconVideo /> Gravar vídeo
        </button>

        <button
          type="button"
          className="botao botao-secundario"
          onClick={() => galeriaRef.current?.click()}
          disabled={bloqueado || cheio}
          aria-busy={aEnviar}
        >
          <IconImage /> Escolher do dispositivo
        </button>
      </div>

      <input
        ref={fotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          processar(e.target.files);
          e.target.value = '';
        }}
      />

      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          processar(e.target.files);
          e.target.value = '';
        }}
      />

      <input
        ref={galeriaRef}
        type="file"
        accept="image/*,video/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          processar(e.target.files);
          e.target.value = '';
        }}
      />

      {aEnviar && (
        <p className="info">
          <IconSpinner /> A enviar ficheiros…
        </p>
      )}

      {valor.length === 0 ? (
        <p className="vazio">Nenhuma evidência anexada.</p>
      ) : (
        <div className="evidencias-grid">
          {valor.map((item, index) => (
            <figure key={`${item.id ?? index}`} className="evidencia-card">
              {String(item.mimeType ?? '').startsWith('image/') ? (
                <img src={item.previewUrl} alt={item.legenda || 'evidência'} />
              ) : (
                <video src={item.previewUrl} controls />
              )}

              <figcaption>
                <strong>
                  {item.legenda || item.url?.split('/').pop() || 'evidência'}
                </strong>
                <small>
                  {String(item.mimeType ?? '').split('/')[1]?.toUpperCase() ?? 'FILE'} ·{' '}
                  {formatBytes(item.tamanho)}
                </small>
              </figcaption>

              <button
                type="button"
                className="botao botao-perigo evidencia-remover"
                onClick={() => remover(index)}
                disabled={bloqueado}
                aria-busy={aEnviar}
                title="Remover evidência"
                aria-label="Remover evidência"
              >
                <IconX />
              </button>
            </figure>
          ))}
        </div>
      )}

      <p className="hint">
        Máximo: {maxArquivos} ficheiros · {maxMB} MB cada · JPG, PNG, WEBP, MP4, WEBM, MOV.
      </p>
    </section>
  );
}