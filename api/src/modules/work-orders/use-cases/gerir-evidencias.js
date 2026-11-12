import { mesmaId } from '../../../shared/id.js';

const TIPOS_EVIDENCIA = new Set(['CHECKLIST', 'SERVICO', 'PECA', 'GERAL']);

function erroAcesso(status, codigo, mensagem) {
  return { status, codigo, mensagem };
}

export function criarGerirEvidencias({ evidenciaRepo }) {
  async function verificarAcesso(ordemId, utilizador, escrita) {
    const os = await evidenciaRepo.procurarAcessoOs(ordemId);
    if (!os) {
      return { erro: erroAcesso(404, 'OS_NAO_ENCONTRADA', 'OS não encontrada.') };
    }

    if (utilizador.perfil === 'MECANICO') {
      if (!mesmaId(os.mecanicoId, utilizador.id)) {
        return {
          erro: erroAcesso(403, 'NAO_AUTORIZADO', 'Esta OS não pertence a este mecânico.'),
        };
      }
      if (escrita && !['EM_DIAGNOSTICO', 'EM_REPARACAO'].includes(os.estado)) {
        return {
          erro: erroAcesso(
            409,
            'OS_NAO_PERMITE_EVIDENCIAS',
            'Só podes anexar evidências durante diagnóstico ou reparação.',
          ),
        };
      }
    }

    return { os };
  }

  return {
    async verificarAcessoEscrita({ ordemId, utilizador }) {
      return verificarAcesso(ordemId, utilizador, true);
    },
    async listar({ ordemId, utilizador }) {
      const acesso = await verificarAcesso(ordemId, utilizador, false);
      if (acesso.erro) return acesso;
      return { data: await evidenciaRepo.listarPorOrdem(ordemId) };
    },
    async registar({ ordemId, utilizador, ficheiro, tipo, referenciaId, legenda, url }) {
      const acesso = await verificarAcesso(ordemId, utilizador, true);
      if (acesso.erro) return acesso;

      const tipoNormalizado = String(tipo ?? 'GERAL').toUpperCase();
      const referencia = referenciaId != null && referenciaId !== ''
        ? Number(referenciaId)
        : null;

      return {
        data: await evidenciaRepo.criar({
          ordemId,
          tipo: TIPOS_EVIDENCIA.has(tipoNormalizado) ? tipoNormalizado : 'GERAL',
          referenciaId: Number.isFinite(referencia) ? referencia : null,
          url,
          mimeType: ficheiro.mimetype,
          tamanho: ficheiro.size,
          legenda: String(legenda ?? '').trim() || null,
          mecanicoId: utilizador.perfil === 'MECANICO' ? utilizador.id : null,
        }),
      };
    },
  };
}
