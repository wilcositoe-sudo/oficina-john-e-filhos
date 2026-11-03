import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, erro: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, erro: error };
  }

  componentDidCatch(error, info) {
    // Em produção, enviar para serviço de logging (Sentry, etc.)
    console.error('Erro capturado pelo boundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="cartao" style={{ textAlign: 'center', padding: 24 }}>
          <h2>😕 Algo correu mal nesta secção</h2>
          <p className="erro">{this.state.erro?.message ?? 'Erro inesperado.'}</p>
          <button className="botao" onClick={() => this.setState({ hasError: false, erro: null })}>
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}