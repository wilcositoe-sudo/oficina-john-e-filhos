import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';
import {
  OFICINA_WEB,
  distanciaKm,
  tempoEstimadoMin,
} from '../lib/oficina.js';

const fmtHora = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('pt-PT', {
        timeZone: 'Africa/Maputo',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const OPCOES_CHEGADA = [
  {
    label: '🚗 Vou levar eu próprio à oficina',
    value: 'LEVAR_OFICINA',
  },
  {
    label: '🏠 Quero que a oficina vá buscar o carro',
    value: 'RECOLHA_DOMICILIO',
  },
];

export default function Assistente() {
  const feedback = useFeedback();

  const [conversa, setConversa] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const [modalLocal, setModalLocal] = useState(false);
  const [aObterLocal, setAObterLocal] = useState(false);
  const [local, setLocal] = useState({
    lat: null,
    lng: null,
    precisao: null,
    bairro: '',
    quarteirao: '',
    numero: '',
    ponto: '',
  });

  const fimRef = useRef(null);
  const iniciadoRef = useRef(false);

  useEffect(() => {
    // Evita duplo init no StrictMode do React em desenvolvimento.
    if (iniciadoRef.current) return;
    iniciadoRef.current = true;

    (async () => {
      try {
        const r = await api('POST', '/chatbot/iniciar');
        setConversa(r.conversa);
        setMensagens(r.mensagens ?? []);
      } catch (e) {
        feedback.mostrarErro(
          'Não foi possível iniciar o assistente',
          e.message,
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens]);

  async function enviar(msgTexto) {
    const conteudo = String(msgTexto ?? '').trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    setTexto('');

    const otimista = {
      id: `temp-${Date.now()}`,
      remetente: 'CLIENTE',
      conteudo,
      criadoAt: new Date().toISOString(),
      metadata: null,
    };

    setMensagens((m) => [...m, otimista]);

    try {
      const r = await api('POST', '/chatbot/mensagens', {
        body: {
          conversaId: conversa?.id,
          texto: conteudo,
        },
      });

      setConversa(r.conversa);
      setMensagens(r.mensagens ?? []);
    } catch (e) {
      setMensagens((m) => m.filter((x) => x.id !== otimista.id));
      setTexto(conteudo);
      feedback.mostrarErro('Falha ao enviar mensagem', e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function agendar(slot) {
    if (!conversa) return;

    const r = await feedback.executar(
      () =>
        api('POST', `/chatbot/conversas/${conversa.id}/agendar`, {
          body: {
            inicioAt: slot.inicioAt,
            fimAt: slot.fimAt,
          },
        }),
      {
        sucesso: 'Diagnóstico agendado',
        sucessoDetalhe: 'Agora escolhe como o carro vai chegar à oficina.',
        carregando: 'A reservar horário…',
      },
    );

    if (r.ok) {
      setConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
    }
  }

  function obterLocalizacao() {
    if (!('geolocation' in navigator)) {
      feedback.mostrarErro(
        'Localização não suportada',
        'O teu navegador não suporta geolocalização. Tenta Chrome, Edge ou Firefox.',
      );
      return;
    }

    setAObterLocal(true);
    feedback.mostrarLoading('A obter a tua localização…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        setLocal((l) => ({
          ...l,
          lat: latitude,
          lng: longitude,
          precisao: accuracy,
        }));

        feedback.fechar();
        setModalLocal(true);
        setAObterLocal(false);
      },
      (err) => {
        feedback.mostrarErro(
          'Não foi possível obter a localização',
          err?.message || 'Permissão negada, timeout ou sinal fraco.',
        );
        setAObterLocal(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  }

  async function escolherChegada(modalidade) {
    if (!conversa) return;

    if (modalidade === 'LEVAR_OFICINA') {
      const r = await feedback.executar(
        () =>
          api('POST', `/chatbot/conversas/${conversa.id}/chegada`, {
            body: { modalidade: 'LEVAR_OFICINA' },
          }),
        {
          sucesso: 'Chegada confirmada',
          sucessoDetalhe: 'O funcionário vai analisar e criar a OS.',
          carregando: 'A registar…',
        },
      );

      if (r.ok) {
        setConversa(r.data.conversa);
        setMensagens(r.data.mensagens ?? []);
      }

      return;
    }

    if (modalidade === 'RECOLHA_DOMICILIO') {
      setModalLocal(true);

      if (!local.lat || !local.lng) {
        obterLocalizacao();
      }
    }
  }

  async function confirmarRecolha() {
    if (!conversa) return;

    if (!local.lat || !local.lng) {
      feedback.mostrarErro(
        'Sem localização',
        'Ativa a localização antes de confirmar a recolha.',
      );
      return;
    }

    const bairro = String(local.bairro ?? '').trim();
    const quarteirao = String(local.quarteirao ?? '').trim();
    const numero = String(local.numero ?? '').trim();
    const ponto = String(local.ponto ?? '').trim();

    if (!bairro || !quarteirao || !numero) {
      feedback.mostrarErro(
        'Endereço incompleto',
        'Preenche bairro, quarteirão e número da casa.',
      );
      return;
    }

    const r = await feedback.executar(
      () =>
        api('POST', `/chatbot/conversas/${conversa.id}/chegada`, {
          body: {
            modalidade: 'RECOLHA_DOMICILIO',
            bairro,
            quarteirao,
            numeroCasa: numero,
            pontoReferencia: ponto || null,
            lat: local.lat,
            lng: local.lng,
            precisao: local.precisao,
          },
        }),
      {
        sucesso: 'Recolha registada',
        sucessoDetalhe: 'O funcionário vai confirmar e criar a OS.',
        carregando: 'A registar recolha…',
      },
    );

    if (r.ok) {
      setModalLocal(false);
      setConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
    }
  }

  if (carregando) {
    return <p className="centro">A preparar assistente…</p>;
  }

  const emAtendimentoHumano =
    conversa?.status === 'EM_ATENDIMENTO' ||
    conversa?.status === 'AGUARDANDO_FUNCIONARIO';

  const conversaEncerrada =
    conversa?.status === 'FECHADA' || conversa?.status === 'CONVERTIDA';

  const semDiagnostico = conversa?.querDiagnostico === false;

  const decisaoPendente =
    conversa?.querDiagnostico == null &&
    conversa?.status === 'AGUARDANDO_FUNCIONARIO';

  const distanciaPreview =
    local.lat != null && local.lng != null
      ? distanciaKm(
          local.lat,
          local.lng,
          OFICINA_WEB.coordenadas.lat,
          OFICINA_WEB.coordenadas.lng,
        )
      : null;

  const tempoPreview =
    distanciaPreview != null
      ? tempoEstimadoMin(distanciaPreview, OFICINA_WEB.velocidadeMediaKmH)
      : null;

  const bbox =
    local.lat != null && local.lng != null
      ? `${local.lng - 0.008},${local.lat - 0.008},${local.lng + 0.008},${local.lat + 0.008}`
      : null;

  const marker =
    local.lat != null && local.lng != null ? `${local.lat},${local.lng}` : null;

  const enderecoCompleto =
    String(local.bairro ?? '').trim() &&
    String(local.quarteirao ?? '').trim() &&
    String(local.numero ?? '').trim();

  const temBotoesChegadaEmMensagem = mensagens.some(
    (m) => m.metadata?.chegada?.length > 0,
  );

  return (
    <section>
      <h2>💬 Assistente da Oficina</h2>
      <p className="subtitulo">
        Fala com o assistente virtual. Se precisar, encaminhamos para um
        funcionário com todo o histórico.
      </p>

      {emAtendimentoHumano && !conversaEncerrada && (
        <p className="info">
          👤 Estás em atendimento humano. Podes continuar a escrever aqui.
        </p>
      )}

      {decisaoPendente && !conversaEncerrada && (
        <p className="info">
          ⏳ A aguardar que um funcionário confirme se queres diagnóstico.
        </p>
      )}

      {semDiagnostico && !conversaEncerrada && (
        <p className="info">
          ❌ Esta conversa está marcada como sem diagnóstico. Será eliminada em
          24 horas se não for convertida em OS.
        </p>
      )}

      {conversaEncerrada && (
        <p className="vazio">
          Esta conversa foi encerrada ou convertida em ordem de serviço.
        </p>
      )}

      <div className="cartao chat-assistente">
        <div className="chat-mensagens chat-assistente-mensagens">
          {mensagens.map((m) => (
            <div
              key={m.id}
              className={`chat-linha ${
                m.remetente === 'CLIENTE'
                  ? 'chat-cliente'
                  : m.remetente === 'STAFF'
                    ? 'chat-staff'
                    : 'chat-bot'
              }`}
            >
              <div className="chat-bolha">
                <small>
                  {m.remetente === 'CLIENTE'
                    ? 'Tu'
                    : m.remetente === 'STAFF'
                      ? 'Funcionário'
                      : 'Assistente'}
                  {' · '}
                  {fmtHora(m.criadoAt)}
                </small>

                <p style={{ whiteSpace: 'pre-wrap' }}>{m.conteudo}</p>

                {m.metadata?.quickReplies?.length > 0 && (
                  <div className="chat-quick-replies">
                    {m.metadata.quickReplies.map((q) => (
                      <button
                        key={q.value}
                        className="botao botao-secundario chat-quick-btn"
                        onClick={() => enviar(q.value)}
                        disabled={enviando || conversaEncerrada}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}

                {m.metadata?.slots?.length > 0 && (
                  <div className="chat-slots">
                    <strong>Horários disponíveis</strong>
                    <div className="chat-slots-grid">
                      {m.metadata.slots.map((s) => (
                        <button
                          key={s.inicioAt}
                          className="botao botao-secundario chat-slot-btn"
                          onClick={() => agendar(s)}
                          disabled={enviando || conversaEncerrada}
                        >
                          {s.rotulo}
                        </button>
                      ))}
                    </div>

                    {m.metadata.aviso && (
                      <p className="erro">{m.metadata.aviso}</p>
                    )}
                  </div>
                )}

                {m.metadata?.chegada?.length > 0 && (
                  <div className="chat-opcoes">
                    <strong>Como queres que o carro chegue à oficina?</strong>
                    <div className="chat-opcoes-grid">
                      {m.metadata.chegada.map((o) => (
                        <button
                          key={o.value}
                          className="botao chat-opcao-btn"
                          onClick={() => escolherChegada(o.value)}
                          disabled={enviando || conversaEncerrada}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {m.metadata?.resumo && (
                  <div className="chat-resumo">
                    <strong>Resumo</strong>
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {m.metadata.resumo.texto}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Fallback: se a conversa estiver em CHEGADA_OFICINA mas nenhuma
              mensagem tiver os botões (ex.: estado antigo), mostramos aqui. */}
          {conversa?.etapa === 'CHEGADA_OFICINA' &&
            !enviando &&
            !conversaEncerrada &&
            !temBotoesChegadaEmMensagem && (
              <div className="chat-opcoes">
                <strong>Como queres que o carro chegue à oficina?</strong>
                <div className="chat-opcoes-grid">
                  {OPCOES_CHEGADA.map((o) => (
                    <button
                      key={o.value}
                      className="botao chat-opcao-btn"
                      onClick={() => escolherChegada(o.value)}
                      disabled={enviando}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {enviando && (
            <div className="chat-linha chat-bot">
              <div className="chat-bolha chat-digitando">
                Assistente a escrever…
              </div>
            </div>
          )}

          <div ref={fimRef} />
        </div>

        <form
          className="linha-row chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              conversaEncerrada
                ? 'Conversa encerrada'
                : 'Escreve a tua mensagem…'
            }
            maxLength={2000}
            disabled={enviando || conversaEncerrada}
          />
          <button
            className="botao"
            type="submit"
            disabled={enviando || conversaEncerrada || !texto.trim()}
          >
            {enviando ? 'A enviar…' : 'Enviar'}
          </button>
        </form>
      </div>

      {modalLocal && (
        <div
          className="modal-localizacao-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModalLocal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Localização para recolha"
        >
          <div className="modal-localizacao cartao">
            <h3>📍 Localização para recolha</h3>
            <p className="hint">
              Vamos usar a tua localização atual para calcular a distância até à
              oficina. Depois preenche bairro, quarteirão e número da casa.
            </p>

            {!local.lat || !local.lng ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button
                  className="botao"
                  onClick={obterLocalizacao}
                  disabled={aObterLocal}
                >
                  {aObterLocal
                    ? 'A obter localização…'
                    : '📍 Usar minha localização'}
                </button>
                <p className="hint" style={{ marginTop: 10 }}>
                  Autoriza o navegador a partilhar a localização. Não guardamos a
                  localização sem o teu consentimento.
                </p>
              </div>
            ) : (
              <>
                <p className="info">
                  Localização obtida · precisão aproximada:{' '}
                  {Math.round(local.precisao || 0)} m
                </p>

                {bbox && marker && (
                  <iframe
                    className="map-preview"
                    title="Mapa da localização"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
                  />
                )}

                <p>
                  <strong>Distância aproximada:</strong>{' '}
                  {distanciaPreview != null
                    ? `${distanciaPreview.toFixed(1)} km`
                    : '—'}
                  {' · '}
                  <strong>Tempo estimado:</strong>{' '}
                  {tempoPreview != null ? `${tempoPreview} min` : '—'}
                </p>

                <div className="localizacao-grid">
                  <label>
                    Bairro
                    <input
                      value={local.bairro}
                      onChange={(e) =>
                        setLocal({ ...local, bairro: e.target.value })
                      }
                      placeholder="Ex.: Sommerschield"
                    />
                  </label>

                  <label>
                    Quarteirão
                    <input
                      value={local.quarteirao}
                      onChange={(e) =>
                        setLocal({ ...local, quarteirao: e.target.value })
                      }
                      placeholder="Ex.: 14"
                    />
                  </label>

                  <label>
                    Número da casa
                    <input
                      value={local.numero}
                      onChange={(e) =>
                        setLocal({ ...local, numero: e.target.value })
                      }
                      placeholder="Ex.: 235"
                    />
                  </label>

                  <label>
                    Ponto de referência (opcional)
                    <input
                      value={local.ponto}
                      onChange={(e) =>
                        setLocal({ ...local, ponto: e.target.value })
                      }
                      placeholder="Ex.: portão azul em frente à farmácia"
                    />
                  </label>
                </div>

                <button
                  className="botao botao-secundario"
                  onClick={obterLocalizacao}
                  disabled={aObterLocal}
                >
                  {aObterLocal ? 'A atualizar…' : '🔄 Atualizar localização'}
                </button>
              </>
            )}

            <div className="feedback-acoes" style={{ marginTop: 16 }}>
              <button
                className="botao botao-secundario"
                onClick={() => setModalLocal(false)}
              >
                Cancelar
              </button>
              <button
                className="botao"
                onClick={confirmarRecolha}
                disabled={
                  aObterLocal ||
                  !local.lat ||
                  !local.lng ||
                  !enderecoCompleto
                }
              >
                Confirmar recolha
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}