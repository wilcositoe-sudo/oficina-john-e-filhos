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

function erroValidacao(mensagem) {
  return erros.contaInternaInvalida?.(mensagem) ?? new Error(mensagem);
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

export function criarSubmeterDiagnostico({
  osRepo,
  servicoRepo,
  pecaRepo,
}) {
  return async function submeterDiagnostico({
    ordemId,
    utilizador,
    checklist,
    servicos,
    pecas,
  }) {
    if (utilizador.perfil !== 'MECANICO') {
      throw erros.naoAutorizado();
    }

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    if (String(os.mecanicoId) !== String(utilizador.id)) {
      throw erros.naoAutorizado();
    }

    if (os.estado !== ESTADOS_OS.EM_DIAGNOSTICO) {
      throw erros.transicaoInvalida(os.estado);
    }

    const servicosValidados = [];
    for (const s of (servicos ?? [])) {
      const quantidade = Math.max(1, Math.trunc(numeroSeguro(s.quantidade, 1)));

      const id = resolverId(s, ['servicoId', 'id']);
      let nome = resolverNome(s);
      let origem = 'CATALOGO';

      if (id != null) {
        // Item do catálogo.
        const catalog = await servicoRepo.procurarPorId(id);
        if (!catalog || catalog.ativo === false) {
          throw erroValidacao(
            `Serviço com id ${id} não está disponível no catálogo.`,
          );
        }
        nome = textoSeguro(catalog.nome) || nome;
      } else {
        // Item personalizado.
        origem = 'CUSTOM';

        if (!nome) {
          throw erroValidacao(
            'Há um serviço personalizado sem nome. Escreve o nome do serviço.',
          );
        }
      }

      servicosValidados.push({
        ordemId,
        servicoId: id,
        quantidade,
        descricaoSnapshot: nome,
        origem,
      });
    }

    const pecasValidadas = [];
    for (const p of (pecas ?? [])) {
      const quantidade = Math.max(1, Math.trunc(numeroSeguro(p.quantidade, 1)));

      const id = resolverId(p, ['pecaId', 'id']);
      let nome = resolverNome(p);
      let origem = 'CATALOGO';

      if (id != null) {
        // Item do catálogo.
        const catalog = await pecaRepo.procurarPorId(id);
        if (!catalog || catalog.ativo === false) {
          throw erroValidacao(
            `Peça com id ${id} não está disponível no catálogo.`,
          );
        }
        nome = textoSeguro(catalog.nome) || nome;
      } else {
        // Item personalizado.
        origem = 'CUSTOM';

        if (!nome) {
          throw erroValidacao(
            'Há uma peça personalizada sem nome. Escreve o nome da peça.',
          );
        }
      }

      pecasValidadas.push({
        ordemId,
        pecaId: id,
        quantidade,
        descricaoSnapshot: nome,
        origem,
      });
    }

    // Transição: EM_DIAGNOSTICO → AGUARDANDO_PRECO_FUNCIONARIO
    const destino = ACOES_TRANSICAO.finalizar_diagnostico;

    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const atualizada = await osRepo.submeterDiagnostico({
      ordemId,
      mecanicoId: utilizador.id,
      checklist: checklist ?? [],
      servicos: servicosValidados,
      pecas: pecasValidadas,
      estadoAnterior: os.estado,
      estado: destino,
      utilizadorId: utilizador.id,
      motivo: 'Diagnóstico concluído pelo mecânico',
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return {
      mensagem: 'Diagnóstico submetido. Aguarda precificação pelo funcionário.',
    };
  };
}