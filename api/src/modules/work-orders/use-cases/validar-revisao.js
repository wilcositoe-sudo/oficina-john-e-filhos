import { erros } from '../../../shared/errors/domain-error.js';
import { ESTADOS_OS, ACOES_TRANSICAO, podeTransitar } from '../domain/estados.js';

export function criarValidarRevisao({ osRepo }) {
  return async function validarRevisao({ ordemId, utilizador, aprovada }) {
    if (utilizador.perfil !== 'FUNCIONARIO' && utilizador.perfil !== 'ADMINISTRADOR') {
      throw erros.naoAutorizado();
    }

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();
    if (os.estado !== ESTADOS_OS.AGUARDANDO_VALIDACAO_FUNCIONARIO) {
      throw erros.transicaoInvalida(os.estado);
    }

    if (aprovada) {
      const destino = ACOES_TRANSICAO.validar_revisao;
      if (!podeTransitar(os.estado, destino)) throw erros.transicaoInvalida(os.estado);
      await osRepo.transitar({
        id: ordemId,
        estado: destino,
        utilizadorId: utilizador.id,
        motivo: 'Funcionário validou os cortes do cliente',
      });
      await osRepo.recalcularTotal(ordemId);
      return { mensagem: 'Revisão aprovada. O mecânico foi notificado.' };
    } else {
      await osRepo.transitar({
        id: ordemId,
        estado: ESTADOS_OS.AGUARDANDO_APROVACAO_CLIENTE,
        utilizadorId: utilizador.id,
        motivo: 'Funcionário recusou os cortes — cliente deve rever',
      });
      return { mensagem: 'Cortes recusados. O cliente foi notificado para rever.' };
    }
  };
}