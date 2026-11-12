import { Component } from 'react';

// Error Boundary — padrão oficial React:
// static getDerivedStateFromError troca o estado e mostra fallback UI;
// componentDidCatch regista o erro (ex.: serviço de analytics em produção).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, erro: null };
  }

  static getDerivedStateFromError(error) {
    // Atualiza o estado para o próximo render mostrar a UI de fallback.
    return { hasError: true, erro: error };
  }

  componentDidCatch(error, info) {
    // Em produção, enviar para serviço de logging (Sentry, etc.).
    console.error('Erro capturado pelo ErrorBoundary:', error, info.componentStack);

    // Owner Stack só está disponível em DESENVOLVIMENTO (a doc avisa que
    // NÃO está disponível em produção) — por isso guardamos atrás de DEV.
    if (import.meta.env.DEV && typeof Component.captureOwnerStack === 'function') {
      console.error('Owner Stack:', Component.captureOwnerStack());
    }
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI personalizável via props.fallback, senão usa a padrão.
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="cartao" style={{ textAlign: 'center', padding: 24 }}>
          <h2>😕 Algo correu mal nesta secção</h2>
          <p className="erro" role="alert">
            {this.state.erro?.message ?? 'Erro inesperado ao carregar esta página.'}
          </p>
          <button
            className="botao"
            onClick={() => this.setState({ hasError: false, erro: null })}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}