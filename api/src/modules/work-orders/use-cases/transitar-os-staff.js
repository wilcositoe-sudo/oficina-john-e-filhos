import { erros } from '../../../shared/errors/domain-error.js';
import { ACOES_TRANSICAO } from '../domain/estados.js';

const ACOES_STAFF_PERMITIDAS = new Set([
  'iniciar_diagnostico',
  'finalizar_diagnostico',
  'iniciar_reparacao',
  'aguardar_pecas',
  'concluir',
  'entregar',
  'cancelar',
]);
const ACOES_RESERVADAS_MECANICO = new Set([
  'iniciar_diagnostico',
  'finalizar_diagnostico',
  'iniciar_reparacao',
  'concluir',
]);

export function criarTransitarOsStaff({ osRepo, transitarOs }) {
  return async function transitarOsStaff({ id, utilizador, acao, motivo }) {
    if (!['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador?.perfil)) {
      throw erros.naoAutorizado();
    }
    if (Object.hasOwn(ACOES_TRANSICAO, acao) && !ACOES_STAFF_PERMITIDAS.has(acao)) {
      throw erros.naoAutorizado();
    }

    if (ACOES_RESERVADAS_MECANICO.has(acao)) {
      const os = await osRepo.procurarPorId(id);
      if (os?.mecanicoId) {
        throw erros.acaoReservadaMecanico();
      }
    }

    return transitarOs({ id, utilizador, acao, motivo });
  };
}
