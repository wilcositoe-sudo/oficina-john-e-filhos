import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconAlert, IconTrash } from './icons.jsx';

const FeedbackContext = createContext(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback deve ser usado dentro de <FeedbackProvider>');
  return ctx;
}

const AUTO_FECHAR_SUCESSO_MS = 1800;

export function FeedbackProvider({ children }) {
  // tipo: 'idle' | 'loading' | 'sucesso' | 'erro'
  const [estado, setEstado] = useState({
    tipo: 'idle',
    titulo: '',
    mensagem: '',
    retry: null,
    confirmacao: null,
  });
  const timerRef = useRef(null);
  const executarRef = useRef(null);
  const resolverConfirmacaoRef = useRef(null);

  const limparTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const fechar = useCallback(() => {
    limparTimer();
    resolverConfirmacaoRef.current?.(false);
    resolverConfirmacaoRef.current = null;
    setEstado({ tipo: 'idle', titulo: '', mensagem: '', retry: null, confirmacao: null });
  }, []);

  const mostrarLoading = useCallback((titulo = 'A processar…') => {
    limparTimer();
    setEstado({ tipo: 'loading', titulo, mensagem: '', retry: null });
  }, []);

  const mostrarSucesso = useCallback((titulo = 'Feito com sucesso', mensagem = '') => {
    setEstado({ tipo: 'sucesso', titulo, mensagem, retry: null });
  }, []);

  const mostrarErro = useCallback((titulo = 'Algo correu mal', mensagem = '', retry = null) => {
    limparTimer();
    setEstado({ tipo: 'erro', titulo, mensagem, retry });
  }, []);

  const confirmar = useCallback(({
    titulo = 'Confirmar ação',
    mensagem = 'Tem a certeza de que pretende continuar?',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    perigo = false,
  } = {}) => new Promise((resolve) => {
    limparTimer();
    resolverConfirmacaoRef.current?.(false);
    resolverConfirmacaoRef.current = resolve;
    setEstado({
      tipo: 'confirmacao',
      titulo,
      mensagem,
      retry: null,
      confirmacao: { textoConfirmar, textoCancelar, perigo },
    });
  }), []);

  const resolverConfirmacao = useCallback((resposta) => {
    const resolver = resolverConfirmacaoRef.current;
    resolverConfirmacaoRef.current = null;
    setEstado({ tipo: 'idle', titulo: '', mensagem: '', retry: null, confirmacao: null });
    resolver?.(resposta);
  }, []);

  // Auto-fechar o sucesso. O cleanup do timer é OBRIGATÓRIO: em dev com
  // StrictMode o efeito monta → desmonta → monta de novo (a doc do React
  // documenta este double-invoke de componentDidMount/WillUnmount). Sem
  // clearTimeout no cleanup, ficaríamos com timers órfãos a fechar o modal
  // cedo ou duas vezes.
  useEffect(() => {
    if (estado.tipo !== 'sucesso') return;
    timerRef.current = setTimeout(fechar, AUTO_FECHAR_SUCESSO_MS);
    return limparTimer;
  }, [estado.tipo, fechar]);

  useEffect(() => () => {
    resolverConfirmacaoRef.current?.(false);
    resolverConfirmacaoRef.current = null;
  }, []);

  /**
   * Embrulha uma ação async: loading bloqueante → sucesso/erro.
   * Devolve { ok:true, data } ou { ok:false, erro }. O caller decide o que
   * fazer a seguir (recarregar/abrir) só quando ok — o modal de sucesso
   * auto-fecha por cima enquanto o caller atualiza o estado por baixo.
   */
  const executar = useCallback(async (fn, opts = {}) => {
    const {
      sucesso = 'Feito com sucesso',
      sucessoDetalhe = '',
      erro = 'Algo correu mal',
      carregando = 'A processar…',
      detalharErro = true,
    } = opts;
    mostrarLoading(carregando);
    try {
      const data = await fn();
      mostrarSucesso(sucesso, sucessoDetalhe);
      return { ok: true, data };
    } catch (e) {
      const msg = detalharErro ? (e?.message ?? String(e)) : '';
      // retry re-executa a MESMA ação via ref (evita referência circular nas deps)
      mostrarErro(erro, msg, () => executarRef.current?.(fn, opts));
      return { ok: false, erro: e };
    }
  }, [mostrarLoading, mostrarSucesso, mostrarErro]);

  executarRef.current = executar;

  const value = useMemo(() => ({
    estado,
    aExecutando: estado.tipo === 'loading',
    fechar,
    mostrarLoading,
    mostrarSucesso,
    mostrarErro,
    confirmar,
    executar,
  }), [estado, fechar, mostrarLoading, mostrarSucesso, mostrarErro, confirmar, executar]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {estado.tipo !== 'idle' && (
        <ModalFeedback
          estado={estado}
          onFechar={fechar}
          onConfirmar={() => resolverConfirmacao(true)}
          onCancelar={() => resolverConfirmacao(false)}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function ModalFeedback({ estado, onFechar, onConfirmar, onCancelar }) {
  const { tipo, titulo, mensagem, retry, confirmacao } = estado;
  // Em loading/erro o backdrop NÃO fecha a clique fora (força reconhecimento
  // e bloqueia o segundo clique). Em sucesso pode fechar cedo.
  const podeFecharFora = tipo === 'sucesso';

  return (
    <div
      className="feedback-backdrop"
      onMouseDown={(e) => { if (e.target === e.currentTarget && podeFecharFora) onFechar(); }}
      onKeyDown={(event) => {
        if (tipo === 'confirmacao' && event.key === 'Escape') onCancelar();
      }}
      role={tipo === 'confirmacao' ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby="feedback-titulo"
      aria-live={tipo === 'erro' ? 'assertive' : 'polite'}
    >
      <div className={`feedback-modal feedback-${tipo}`}>
        {tipo === 'confirmacao' && (
          <>
            <div className={`feedback-icone ${confirmacao.perigo ? 'feedback-icone-erro' : 'feedback-icone-aviso'}`} aria-hidden="true">
              {confirmacao.perigo ? <IconTrash /> : <IconAlert />}
            </div>
            <p id="feedback-titulo" className="feedback-titulo">{titulo}</p>
            <p className="feedback-msg">{mensagem}</p>
            <div className="feedback-acoes">
              <button type="button" className="botao botao-secundario" onClick={onCancelar} autoFocus>
                {confirmacao.textoCancelar}
              </button>
              <button
                type="button"
                className={`botao${confirmacao.perigo ? ' botao-perigo' : ''}`}
                onClick={onConfirmar}
              >
                {confirmacao.textoConfirmar}
              </button>
            </div>
          </>
        )}

        {tipo === 'loading' && (
          <>
            <div className="feedback-spinner" aria-hidden="true" />
            <p id="feedback-titulo" className="feedback-titulo">{titulo}</p>
          </>
        )}

        {tipo === 'sucesso' && (
          <>
            <div className="feedback-icone feedback-icone-ok" aria-hidden="true"><IconCheck /></div>
            <p id="feedback-titulo" className="feedback-titulo">{titulo}</p>
            {mensagem && <p className="feedback-msg">{mensagem}</p>}
          </>
        )}

        {tipo === 'erro' && (
          <>
            <div className="feedback-icone feedback-icone-erro" aria-hidden="true"><IconAlert /></div>
            <p id="feedback-titulo" className="feedback-titulo">{titulo}</p>
            {mensagem && <p className="feedback-msg feedback-msg-erro">{mensagem}</p>}
            <div className="feedback-acoes">
              {retry && <button className="botao" onClick={retry}>Tentar novamente</button>}
              <button className="botao botao-secundario" onClick={onFechar}>Fechar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}