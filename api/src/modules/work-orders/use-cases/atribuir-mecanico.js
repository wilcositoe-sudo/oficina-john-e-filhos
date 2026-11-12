import { erros } from '../../../shared/errors/domain-error.js';
import {
  ESTADOS_OS,
  ACOES_TRANSICAO,
  podeTransitar,
} from '../domain/estados.js';

export function criarAtribuirMecanico({ osRepo, utilizadorRepo }) {
  return async function atribuirMecanico({
    ordemId,
    id,
    mecanicoId,
    utilizador,
  }) {
    const ordem = ordemId ?? id;

    if (!['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador?.perfil)) {
      throw erros.naoAutorizado();
    }

    if (!ordem) {
      throw erros.osNaoEncontrada();
    }

    if (!mecanicoId) {
      throw erros.contaInternaInvalida('Mecânico obrigatório.');
    }

    const os = await osRepo.procurarPorId(ordem);
    if (!os) throw erros.osNaoEncontrada();

    const mecanico = await utilizadorRepo.procurarPorId(mecanicoId);
    if (!mecanico) {
      throw erros.utilizadorNaoEncontrado();
    }

    if (mecanico.perfil !== 'MECANICO') {
      throw erros.contaInternaInvalida('O utilizador indicado não é mecânico.');
    }

    if (!mecanico.ativo) {
      throw erros.contaInternaInvalida('Mecânico inativo.');
    }

    const estadosDiagnosticos = new Set([
      ESTADOS_OS.PENDENTE,
      ESTADOS_OS.AGUARDANDO_DIAGNOSTICO,
    ]);

    const estadoReparacao = ESTADOS_OS.AGUARDANDO_ATRIBUICAO_REPARACAO;

    const ehAtribuicaoReparacao = os.estado === estadoReparacao;

    if (!estadosDiagnosticos.has(os.estado) && !ehAtribuicaoReparacao) {
      throw erros.transicaoInvalida(os.estado);
    }

    const destino = ehAtribuicaoReparacao
      ? ACOES_TRANSICAO.atribuir_reparacao
      : ACOES_TRANSICAO.atribuir_mecanico;

    if (!podeTransitar(os.estado, destino)) {
      throw erros.transicaoInvalida(os.estado);
    }

    const motivo = ehAtribuicaoReparacao
      ? 'Funcionário atribuiu mecânico para reparação'
      : 'Funcionário atribuiu OS ao mecânico para diagnóstico';

    const atualizada = await osRepo.atribuirMecanico({
      ordemId: ordem,
      mecanicoId,
      estadoAnterior: os.estado,
      estadoNovo: destino,
      utilizadorId: utilizador.id,
      motivo,
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);

    return {
      mensagem: ehAtribuicaoReparacao
        ? 'Mecânico de reparação atribuído. A OS passou para aguardando reparação.'
        : 'OS atribuída ao mecânico.',
    };
  };
}