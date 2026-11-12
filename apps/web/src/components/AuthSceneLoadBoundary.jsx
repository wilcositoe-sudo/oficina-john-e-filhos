import { Component } from 'react';

export default class AuthSceneLoadBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Não foi possível carregar a experiência 3D de autenticação.', error);
    this.props.onSceneError();
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="auth-workshop-canvas auth-scene-fallback" role="status">
          A experiência 3D não está disponível neste dispositivo. Pode continuar com o acesso.
        </div>
      );
    }

    return this.props.children;
  }
}
