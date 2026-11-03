import { erros } from '../../../shared/errors/domain-error.js';
import { ESTADOS_OS, ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarPrecificarOS({ osRepo }) {
  return async function precificarOS({ ordemId, utilizador, taxaDiagnostico, precos }) {
    if (utilizador.perfil !== 'FUNCIONARIO' && utilizador.perfil !== 'ADMINISTRADOR') {
      throw erros.naoAutorizado();
    }

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (os.estado !== ESTADOS_OS.AGUARDANDO_PRECO_FUNCIONARIO) throw erros.transicaoInvalida(os.estado);

    const taxa = Number(taxaDiagnostico ?? 0);
    if (taxa < 0 || Number.isNaN(taxa)) throw erros.taxaDiagnosticoInvalida();

    // Atribuir preços às linhas
    for (const p of (precos ?? [])) {
      if (p.tipo === 'servico') {
        await osRepo.precificarLinhaServico({ linhaId: p.linhaId, precoUnitario: p.preco });
      } else if (p.tipo === 'peca') {
        await osRepo.precificarLinhaPeca({ linhaId: p.linhaId, precoUnitario: p.preco });
      }
    }

    // Definir taxa de diagnóstico
    await osRepo.definirTaxaDiagnostico({ ordemId, taxa });

    // Recalcular total
    await osRepo.recalcularTotal(ordemId);

    // Transição: AGUARDANDO_PRECO_FUNCIONARIO → AGUARDANDO_APROVACAO_CLIENTE
    const destino = ACOES_TRANSICAO.precificar;
    if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
    await osRepo.atualizarEstado({ ordemId, estado: destino, utilizadorId: utilizador.id, motivo: 'Orçamento precificado e enviado ao cliente' });

    return { mensagem: 'Orçamento enviado ao cliente para aprovação.' };
  };
}