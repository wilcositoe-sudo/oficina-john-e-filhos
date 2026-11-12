export function podeGerirCatalogo(utilizador) {
  return (
    utilizador?.perfil === 'ADMINISTRADOR' ||
    utilizador?.podeGerirCatalogo === true
  );
}

export function erroPermissaoCatalogo() {
  return {
    codigo: 'SEMA_PERMISSAO_GERIR_CATALOGO',
    mensagem:
      'Apenas administradores ou funcionários autorizados podem gerir serviços e peças.',
  };
}