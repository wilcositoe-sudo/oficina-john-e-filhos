import { erros } from '../../../shared/errors/domain-error.js';
import {
  ESTADOS_OS,
  ACOES_TRANSICAO,
  podeTransitar,
} from '../domain/estados.js';

function numeroSeguro(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function textoSeguro(v) {
  return String(v ?? '').trim();
}

function resolverId(item, chaves) {
  for (const chave of chaves) {
    const bruto = item?.[chave];

    if (bruto != null && bruto !== '') {
      const n = Number(bruto);
      if (Number.isFinite(n)) return n;
    }
  }

  return null;
}

function resolverNome(item) {
  return textoSeguro(
    item?.nome ??
      item?.descricao ??
      item?.descricaoSnapshot ??
      item?.name ??
      '',
  );
}

export function criarRegistarNovaNecessidade({
  osRepo,
  servicoRepo,
  pecaRepo,
}) {
  return async function registarNovaNecessidade({
    ordemId,
    utilizador,
    servicos,
    pecas,
  }) {
    if (utilizador.perfil !== 'MECANICO') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (String(os.mecanicoId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    const estadosPermitidos = new Set([
      ESTADOS_OS.EM_REPARACAO,
      ESTADOS_OS.AGUARDANDO_PECAS,
    ]);

    if (!estadosPermitidos.has(os.estado)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const servicosValidos = (servicos ?? []).filter((s) => {
      const id = resolverId(s, ['servicoId', 'id']);
      const nome = resolverNome(s);
      return id != null || nome;
    });

    const pecasValidas = (pecas ?? []).filter((p) => {
      const id = resolverId(p, ['pecaId', 'id']);
      const nome = resolverNome(p);
      return id != null || nome;
    });

    if (servicosValidos.length === 0 && pecasValidas.length === 0) {
      throw new Error(
        'Regista pelo menos um serviço ou uma peça extra.',
      );
    }

    for (const s of servicosValidos) {
      const quantidade = Math.max(1, Math.trunc(numeroSeguro(s.quantidade, 1)));
      const id = resolverId(s, ['servicoId', 'id']);
      let nome = resolverNome(s);
      let origem = 'CATALOGO';

      if (id != null) {
        const catalog = await servicoRepo.procurarPorId(id);
        if (!catalog || catalog.ativo === false) {
          throw erros.contaInternaInvalida(
            `Serviço com id ${id} não está disponível no catálogo.`,
          );
        }
        nome = textoSeguro(catalog.nome) || nome;
      } else {
        origem = 'CUSTOM';

        if (!nome) {
          throw new Error('Serviço extra personalizado sem nome.');
        }
      }

      await osRepo.lancarServicoSemPreco({
        ordemId,
        servicoId: id,
        quantidade,
        descricaoSnapshot: nome,
        origem,
      });
    }

    for (const p of pecasValidas) {
      const quantidade = Math.max(1, Math.trunc(numeroSeguro(p.quantidade, 1)));
      const id = resolverId(p, ['pecaId', 'id']);
      let nome = resolverNome(p);
      let origem = 'CATALOGO';

      if (id != null) {
        const catalog = await pecaRepo.procurarPorId(id);
        if (!catalog || catalog.ativo === false) {
          throw erros.contaInternaInvalida(
            `Peça com id ${id} não está disponível no catálogo.`,
          );
        }
        nome = textoSeguro(catalog.nome) || nome;
      } else {
        origem = 'CUSTOM';

        if (!nome) {
          throw new Error('Peça extra personalizada sem nome.');
        }
      }

      await osRepo.lancarPecaSemPreco({
        ordemId,
        pecaId: id,
        quantidade,
        descricaoSnapshot: nome,
        origem,
      });
    }

    const destino = ACOES_TRANSICAO.nova_necessidade;

    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const atualizada = await osRepo.atualizarEstado({
      ordemId,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Mecânico registou necessidade extra durante a reparação',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return {
      mensagem:
        'Necessidade extra registada. A OS voltou para precificação pelo funcionário.',
    };
  };
}