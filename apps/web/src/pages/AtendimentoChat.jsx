import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useFeedback } from '../components/Feedback.jsx';
import ChatOS from '../components/ChatOS.jsx';

const fmtHora = (iso) =>
  iso
    ? new Date(iso).toLocaleTimeString('pt-PT', {
        timeZone: 'Africa/Maputo',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const fmtDataHora = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-PT', {
        timeZone: 'Africa/Maputo',
      })
    : '—';

const ROTULO_STATUS = {
  BOT: 'Assistente',
  EM_ATENDIMENTO: 'Em atendimento',
  AGUARDANDO_FUNCIONARIO: 'Aguarda funcionário',
  FECHADA: 'Encerrada',
  CONVERTIDA: 'Convertida em OS',
};

function textoChegada(conversa) {
  if (conversa?.chegadaModalidade === 'RECOLHA_DOMICILIO') {
    const partes = [
      conversa.chegadaBairro,
      conversa.chegadaQuarteirao ? `Quarteirão ${conversa.chegadaQuarteirao}` : null,
      conversa.chegadaNumeroCasa ? `Casa ${conversa.chegadaNumeroCasa}` : null,
      conversa.chegadaPontoReferencia ? `Ref: ${conversa.chegadaPontoReferencia}` : null,
    ].filter(Boolean);

    const distancia =
      conversa.chegadaDistanciaKm != null
        ? `${Number(conversa.chegadaDistanciaKm).toFixed(1)} km`
        : null;

    const tempo =
      conversa.chegadaTempoMin != null
        ? `${conversa.chegadaTempoMin} min`
        : null;

    return `🏠 Recolha: ${partes.join(' · ')}${distancia ? ` · ${distancia}` : ''}${
      tempo ? ` · ${tempo}` : ''
    }`;
  }

  if (conversa?.chegadaModalidade === 'LEVAR_OFICINA') {
    return '🚗 O cliente levará o carro à oficina.';
  }

  return '⚠️ Chegada à oficina ainda não definida.';
}

function textoDiagnostico(conversa) {
  if (conversa?.querDiagnostico === true) return '✅ Quer diagnóstico';
  if (conversa?.querDiagnostico === false) return '❌ Não quer diagnóstico';
  return '⏳ Decisão de diagnóstico pendente';
}

function atualizarMensagensSeMudaram(setMensagens, novasMensagens) {
  setMensagens((atuais) => {
    const novas = novasMensagens ?? [];
    if (
      atuais.length === novas.length &&
      atuais.at(-1)?.id === novas.at(-1)?.id
    ) {
      return atuais;
    }
    return novas;
  });
}

export default function AtendimentoChat({ utilizador }) {
  const feedback = useFeedback();

  const [lista, setLista] = useState([]);
  const [selecionada, setSelecionada] = useState(null);
  const [osSelecionada, setOsSelecionada] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [resposta, setResposta] = useState('');
  const [descricaoProblemaConversao, setDescricaoProblemaConversao] =
    useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erroSincronizacao, setErroSincronizacao] = useState('');
  const selecionadaRef = useRef(null);
  const sincronizandoRef = useRef(false);

  function selecionarConversa(conversa) {
    if (String(selecionadaRef.current?.id) !== String(conversa?.id)) {
      setDescricaoProblemaConversao('');
    }
    selecionadaRef.current = conversa;
    setSelecionada(conversa);
    setOsSelecionada(null);
  }

  async function carregarLista() {
    try {
    const [chatbot, ordens] = await Promise.all([
      api('GET', '/chatbot/staff/conversas'),
      api('GET', '/mensagens/conversas'),
    ]);
    const itens = [
      ...(Array.isArray(chatbot) ? chatbot : []).map((item) => ({
        ...item,
        tipo: 'CHATBOT',
        titulo: item.nomeCliente || item.email || `Cliente #${item.utilizadorId}`,
        preview: item.ultimaMensagemPreview || item.problema || 'Sem mensagens',
        atualizadoAt: item.ultimaMensagemAt || item.atualizadoAt,
        naoLidas: item.naoLidasStaff ?? 0,
      })),
      ...(Array.isArray(ordens) ? ordens : []),
    ];
    itens.sort((a, b) => new Date(b.atualizadoAt ?? 0) - new Date(a.atualizadoAt ?? 0));
    setLista(itens);
    } catch (e) {
    feedback.mostrarErro('Falha ao carregar conversas', e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    async function sincronizar() {
      if (document.visibilityState !== 'visible' || sincronizandoRef.current) return;
      sincronizandoRef.current = true;

      try {
        const selecionadaAtual = selecionadaRef.current;
        const [chatbot, ordens, detalhe] = await Promise.all([
          api('GET', '/chatbot/staff/conversas'),
          api('GET', '/mensagens/conversas'),
          selecionadaAtual
            ? api('GET', `/chatbot/conversas/${selecionadaAtual.id}`)
            : Promise.resolve(null),
        ]);
        if (!ativo) return;

        const itens = [
          ...(Array.isArray(chatbot) ? chatbot : []).map((item) => ({
            ...item,
            tipo: 'CHATBOT',
            titulo: item.nomeCliente || item.email || `Cliente #${item.utilizadorId}`,
            preview: item.ultimaMensagemPreview || item.problema || 'Sem mensagens',
            atualizadoAt: item.ultimaMensagemAt || item.atualizadoAt,
            naoLidas: item.naoLidasStaff ?? 0,
          })),
          ...(Array.isArray(ordens) ? ordens : []),
        ];
        itens.sort((a, b) => new Date(b.atualizadoAt ?? 0) - new Date(a.atualizadoAt ?? 0));
        setLista(itens);
        if (
          detalhe &&
          String(selecionadaRef.current?.id) === String(detalhe.conversa.id)
        ) {
          selecionarConversa(detalhe.conversa);
          atualizarMensagensSeMudaram(setMensagens, detalhe.mensagens);
        } else if (selecionadaAtual && !itens.some((item) => (
          item.tipo === 'CHATBOT' && String(item.id) === String(selecionadaAtual.id)
        ))) {
          selecionarConversa(null);
          setMensagens([]);
        }
        setErroSincronizacao('');
      } catch (erro) {
        if (ativo) setErroSincronizacao(erro.message);
      } finally {
        if (ativo) setCarregando(false);
        sincronizandoRef.current = false;
      }
    }

    void sincronizar();
    const intervalo = window.setInterval(() => {
      void sincronizar();
    }, 2500);
    const aoFocar = () => void sincronizar();
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') void sincronizar();
    };
    window.addEventListener('focus', aoFocar);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      window.removeEventListener('focus', aoFocar);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, []);

  async function abrir(item) {
    if (item.tipo === 'OS') {
      selecionadaRef.current = null;
      setSelecionada(null);
      setMensagens([]);
      setOsSelecionada(item);
      return;
    }

    try {
      const r = await api('GET', `/chatbot/conversas/${item.id}`);
      setOsSelecionada(null);
      selecionarConversa(r.conversa);
      setMensagens(r.mensagens ?? []);

      setLista((ls) =>
        ls.map((c) =>
          c.tipo === 'CHATBOT' && String(c.id) === String(item.id)
            ? { ...c, naoLidasStaff: 0, naoLidas: 0 }
            : c,
        ),
      );
    } catch (e) {
      feedback.mostrarErro('Falha ao abrir conversa', e.message);
    }
  }

  async function ocultarConversa(event, item) {
    event.stopPropagation();
    const confirmado = await feedback.confirmar({
      titulo: 'Remover conversa',
      mensagem: 'Remover esta conversa apenas da tua lista? O outro participante continuará a vê-la.',
      textoConfirmar: 'Remover',
      perigo: true,
    });
    if (!confirmado) return;
    try {
      const path = item.tipo === 'OS'
        ? `/mensagens/conversas/${item.id}`
        : `/chatbot/staff/conversas/${item.id}`;
      await api('DELETE', path);
      if (
        (item.tipo === 'OS' && String(osSelecionada?.id) === String(item.id))
        || (item.tipo === 'CHATBOT' && String(selecionada?.id) === String(item.id))
      ) {
        selecionarConversa(null);
        setOsSelecionada(null);
        setMensagens([]);
      }
      await carregarLista();
    } catch (error) {
      feedback.mostrarErro('Não foi possível remover a conversa', error.message);
    }
  }

  async function atender() {
    if (!selecionada) return;

    const r = await feedback.executar(
      () => api('POST', `/chatbot/staff/conversas/${selecionada.id}/atender`),
      {
        sucesso: 'Conversa atribuída a ti',
        carregando: 'A atender…',
      },
    );

    if (r.ok) {
      selecionarConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
      await carregarLista();
    }
  }

  async function enviarResposta() {
    const conteudo = resposta.trim();
    if (!conteudo || enviando || !selecionada) return;

    setEnviando(true);

    try {
      const r = await api(
        'POST',
        `/chatbot/staff/conversas/${selecionada.id}/mensagens`,
        {
          body: { conteudo },
        },
      );

      selecionarConversa(r.conversa);
      setMensagens(r.mensagens ?? []);
      setResposta('');
      await carregarLista();
    } catch (e) {
      feedback.mostrarErro('Falha ao responder', e.message);
    } finally {
      setEnviando(false);
    }
  }

  async function definirDiagnostico(querDiagnostico) {
    if (!selecionada) return;

    const r = await feedback.executar(
      () =>
        api(
          'POST',
          `/chatbot/staff/conversas/${selecionada.id}/decisao-diagnostico`,
          {
            body: { querDiagnostico },
          },
        ),
      {
        sucesso: querDiagnostico
          ? 'Marcado: cliente quer diagnóstico'
          : 'Marcado: cliente não quer diagnóstico',
        sucessoDetalhe: querDiagnostico
          ? 'Agora falta garantir agendamento e chegada à oficina para converter em OS.'
          : 'A conversa será removida 24 horas após a última mensagem.',
        carregando: 'A registar decisão…',
      },
    );

    if (r.ok) {
      selecionarConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
      await carregarLista();
    }
  }

  async function converter() {
    if (!selecionada) return;

    const r = await feedback.executar(
      () => {
        const descricao = descricaoProblemaConversao.trim() || selecionada.problema;
        return api('POST', `/chatbot/staff/conversas/${selecionada.id}/converter`, {
          body: { descricaoProblema: descricao },
        });
      },
      {
        sucesso: 'OS criada com sucesso',
        sucessoDetalhe: 'O cliente foi notificado na conversa.',
        carregando: 'A criar OS…',
      },
    );

    if (r.ok) {
      selecionarConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
      await carregarLista();
    }
  }

  async function fechar() {
    if (!selecionada) return;

    const r = await feedback.executar(
      () => api('POST', `/chatbot/staff/conversas/${selecionada.id}/fechar`),
      {
        sucesso: 'Conversa encerrada',
        sucessoDetalhe: selecionada.osId
          ? 'A OS continua ativa.'
          : selecionada.querDiagnostico === false
            ? 'A conversa será removida 24 horas após a última mensagem.'
            : 'A conversa ficará guardada no histórico até ser removida da lista.',
        carregando: 'A encerrar…',
      },
    );

    if (r.ok) {
      selecionarConversa(r.data.conversa);
      setMensagens(r.data.mensagens ?? []);
      await carregarLista();
    }
  }

  if (carregando) {
    return <p className="centro">A carregar atendimentos…</p>;
  }

  const bloqueada =
    selecionada?.status === 'CONVERTIDA' || selecionada?.status === 'FECHADA';

  const problemaRegistado = String(selecionada?.problema ?? '').trim();
  const problemaParaConversao =
    descricaoProblemaConversao.trim() || problemaRegistado;

  const podeConverter =
    !!selecionada?.veiculoId &&
    problemaParaConversao.length >= 10 &&
    !!selecionada?.email &&
    selecionada?.querDiagnostico === true &&
    !!selecionada?.chegadaModalidade;

  return (
    <section className="pagina-chat">
      <h2>💬 Conversas e atendimento</h2>
      <p className="subtitulo">
        Atende os clientes e acompanha as mensagens das ordens de serviço.
      </p>
      {erroSincronizacao && (
        <p className="erro" role="status">
          Não foi possível sincronizar o atendimento. A tentar novamente: {erroSincronizacao}
        </p>
      )}

      <div className="chat-staff-layout">
        <aside className="cartao chat-staff-lista">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <h3>Conversas</h3>
            <button
              className="botao botao-secundario"
              onClick={carregarLista}
              disabled={enviando}
            >
              Atualizar
            </button>
          </div>

          {lista.length === 0 ? (
            <p className="vazio">Ainda não há conversas.</p>
          ) : (
            <ul className="chat-staff-itens">
              {lista.map((c) => (
                <li
                  key={`${c.tipo}-${c.id}`}
                  className={`chat-staff-item ${
                    (c.tipo === 'OS' && String(osSelecionada?.id) === String(c.id))
                    || (c.tipo === 'CHATBOT' && String(selecionada?.id) === String(c.id))
                      ? 'ativa'
                      : ''
                  }`}
                >
                  <button type="button" className="chat-staff-select" onClick={() => abrir(c)}>
                    <span className={`chat-avatar ${c.tipo === 'OS' ? 'chat-avatar-os' : ''}`}>
                      {c.tipo === 'OS' ? 'OS' : (c.titulo?.trim()?.[0] ?? 'C').toUpperCase()}
                    </span>
                    <span className="chat-staff-item-copy">
                      <strong>{c.tipo === 'OS' ? `${c.numeroOS} · ${c.nomeCliente}` : c.titulo}</strong>
                      <small>{c.tipo === 'OS' ? c.estado : (ROTULO_STATUS[c.status] ?? c.status)}</small>
                      {c.tipo === 'CHATBOT' && c.problema && (
                        <small className="chat-staff-preview">Problema: {c.problema}</small>
                      )}
                      {c.tipo === 'CHATBOT' && <small className="chat-staff-preview">{textoDiagnostico(c)}</small>}
                      <small className="chat-staff-preview">{c.preview}</small>
                    </span>
                    {c.naoLidas > 0 && <span className="chat-unread">{c.naoLidas}</span>}
                  </button>
                  <button
                    type="button"
                    className="chat-inbox-delete"
                    aria-label={`Remover conversa ${c.tipo === 'OS' ? c.numeroOS : c.titulo} da tua lista`}
                    title="Remover apenas da tua lista"
                    onClick={(event) => ocultarConversa(event, c)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="chat-inbox-retencao">
            Conversas sem diagnóstico expiram 24 horas após a última mensagem. As restantes ficam guardadas até as removeres.
          </p>
        </aside>

        <div className="cartao chat-staff-conversa" role="region" aria-label="Conversa selecionada">
          {osSelecionada ? (
            <div className="chat-os-panel">
              <header className="chat-os-inbox-heading">
                <div>
                  <span className="landing-section-kicker">Conversa da ordem</span>
                  <h3>{osSelecionada.numeroOS} · {osSelecionada.nomeCliente}</h3>
                  <small>{osSelecionada.estado}</small>
                </div>
                <button
                  type="button"
                  className="botao botao-perigo"
                  onClick={(event) => ocultarConversa(event, osSelecionada)}
                >
                  Remover da minha lista
                </button>
              </header>
              <ChatOS
                ordemId={osSelecionada.id}
                titulo={osSelecionada.numeroOS}
                perfil={utilizador?.perfil ?? 'FUNCIONARIO'}
                aoAtualizar={carregarLista}
              />
            </div>
          ) : !selecionada ? (
            <p className="vazio">Escolhe uma conversa à esquerda.</p>
          ) : (
            <>
              <div className="chat-staff-cabecalho">
                <div>
                  <h3>{selecionada.nomeCliente || selecionada.email}</h3>

                  <small>
                    {ROTULO_STATUS[selecionada.status] ?? selecionada.status}
                    {selecionada.problema
                      ? ` · Problema: ${selecionada.problema}`
                      : ''}
                  </small>

                  <div style={{ marginTop: 6 }}>
                    <small>{textoChegada(selecionada)}</small>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <small>{textoDiagnostico(selecionada)}</small>
                  </div>

                  {selecionada.agendadoAt && (
                    <div style={{ marginTop: 4 }}>
                      <small>
                        Diagnóstico agendado: {fmtDataHora(selecionada.agendadoAt)}
                      </small>
                    </div>
                  )}

                  {selecionada.expiraEm && (
                    <div style={{ marginTop: 4 }}>
                      <small>
                        ⏳ Expira em: {fmtDataHora(selecionada.expiraEm)}
                      </small>
                    </div>
                  )}
                </div>

                <div className="chat-staff-acoes">
                  <button
                    className="botao botao-secundario"
                    onClick={atender}
                    disabled={enviando || bloqueada}
                  >
                    Atender
                  </button>

                  <button
                    className="botao botao-secundario"
                    onClick={() => definirDiagnostico(true)}
                    disabled={enviando || bloqueada}
                  >
                    ✅ Quer diagnóstico
                  </button>

                  <button
                    className="botao botao-perigo"
                    onClick={() => definirDiagnostico(false)}
                    disabled={enviando || bloqueada}
                  >
                    ❌ Não quer diagnóstico
                  </button>

                  <button
                    className="botao"
                    onClick={converter}
                    disabled={!podeConverter || enviando || bloqueada}
                    title={
                      !podeConverter
                        ? 'Para converter em OS: veículo, problema, e-mail, cliente quer diagnóstico e chegada à oficina definida.'
                        : 'Criar OS a partir deste lead.'
                    }
                  >
                    Converter em OS
                  </button>

                  <button
                    className="botao botao-perigo"
                    onClick={fechar}
                    disabled={
                      enviando ||
                      selecionada.status === 'CONVERTIDA' ||
                      selecionada.status === 'FECHADA'
                    }
                  >
                    Encerrar
                  </button>
                </div>
              </div>

              {problemaRegistado.length < 10 && (
                <label className="campo" style={{ padding: '12px 16px 0' }}>
                  {problemaRegistado
                    ? 'Completa a descrição do problema (mínimo 10 caracteres) para converter em OS.'
                    : 'Indica o problema reportado (mínimo 10 caracteres) para converter em OS.'}
                  <textarea
                    value={descricaoProblemaConversao}
                    onChange={(e) =>
                      setDescricaoProblemaConversao(e.target.value)
                    }
                    placeholder={problemaRegistado}
                    maxLength={2000}
                    rows={3}
                    disabled={enviando || bloqueada}
                  />
                </label>
              )}

              <div
                className="chat-mensagens chat-assistente-mensagens"
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label="Histórico da conversa"
              >
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
                          ? 'Cliente'
                          : m.remetente === 'STAFF'
                            ? 'Funcionário'
                            : 'Assistente'}
                        {' · '}
                        {fmtHora(m.criadoAt)}
                      </small>

                      <p style={{ whiteSpace: 'pre-wrap' }}>{m.conteudo}</p>
                    </div>
                  </div>
                ))}
              </div>

              <form
                className="linha-row chat-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  enviarResposta();
                }}
              >
                <input
                  value={resposta}
                  onChange={(e) => setResposta(e.target.value)}
                  placeholder="Responder ao cliente…"
                  maxLength={2000}
                  disabled={enviando || bloqueada}
                />
                <button
                  className="botao"
                  type="submit"
                  disabled={enviando || bloqueada || !resposta.trim()}
                >
                  {enviando ? 'A enviar…' : 'Responder'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}