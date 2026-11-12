export function criarGerirNotificacoes({ notificacaoRepo }) {
  return {
    listar({ utilizadorId, perfil }) {
      return notificacaoRepo.listarPorUtilizador({ utilizadorId, perfil });
    },
    marcarTodasLidas({ utilizadorId, perfil }) {
      return notificacaoRepo.marcarTodasLidas({ utilizadorId, perfil });
    },
    marcarLida({ id, utilizadorId, perfil }) {
      return notificacaoRepo.marcarLida({ id, utilizadorId, perfil });
    },
  };
}
