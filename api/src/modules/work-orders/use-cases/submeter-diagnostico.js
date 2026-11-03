import { erros } from '../../../shared/errors/domain-error.js';
import { ESTADOS_OS, ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarSubmeterDiagnostico({ osRepo }) {
  return async function submeterDiagnostico({ ordemId, utilizador, checklist, servicos, pecas }) {
    if (utilizador.perfil !== 'MECANICO') throw erros.naoAutorizado();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (os.mecanicoId !== utilizador.id) throw erros.naoAutorizado();
    if (os.estado !== ESTADOS_OS.EM_DIAGNOSTICO) throw erros.transicaoInvalida(os.estado);

    // Guardar checklist (se o repo tiver o método)
    if (checklist?.length > 0 && osRepo.guardarChecklist) {
      await osRepo.guardarChecklist({ ordemId, mecanicoId: utilizador.id, itens: checklist });
    }

    // Lançar serviços SEM preço
    for (const s of (servicos ?? [])) {
      await osRepo.lancarServicoSemPreco({
        ordemId,
        servicoId: s.servicoId,
        quantidade: s.quantidade ?? 1,
        descricaoSnapshot: s.descricao ?? `Serviço #${s.servicoId}`,
      });
    }

    // Lançar peças SEM preço
    for (const p of (pecas ?? [])) {
      await osRepo.lancarPecaSemPreco({
        ordemId,
        pecaId: p.pecaId,
        quantidade: p.quantidade ?? 1,
      });
    }

    // Transição: EM_DIAGNOSTICO → AGUARDANDO_PRECO_FUNCIONARIO
    const destino = ACOES_TRANSICAO.finalizar_diagnostico;
    if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
    await osRepo.atualizarEstado({ ordemId, estado: destino, utilizadorId: utilizador.id, motivo: 'Diagnóstico concluído pelo mecânico' });

    return { mensagem: 'Diagnóstico submetido. Aguarda precificação pelo funcionário.' };
  };
}