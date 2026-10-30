import { slotsDoDia, dataDoPedido } from '../domain/horario.js';

// RF03: o cliente consulta slots ANTES de escolher. A decisão final é na reserva (anti-corrida).
export function criarConsultarDisponibilidade({ agendamentoRepo }) {
  return async function consultarDisponibilidade({ data }) {
    const dataISO = dataDoPedido(data);
    const ocupados = await agendamentoRepo.ocupadosNoDia(dataISO);
    return { data: dataISO, slots: slotsDoDia(dataISO, ocupados) };
  };
}