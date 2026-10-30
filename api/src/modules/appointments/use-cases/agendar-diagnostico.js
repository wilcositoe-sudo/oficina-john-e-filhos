import { erros } from '../../../shared/errors/domain-error.js';
import { DURACAO_SLOT_MS, HORA_ABERTURA, HORA_FECHO, FUSO } from '../domain/horario.js';

// RF03: reserva com revalidação no ato. RN01: veículo do cliente.
export function criarAgendarDiagnostico({ agendamentoRepo, veiculoRepo }) {
  return async function agendarDiagnostico({ utilizadorId, veiculoId, inicioAt }) {
    if (!inicioAt || Number.isNaN(Date.parse(inicioAt))) {
      throw erros.horarioInvalido('Indique o início no formato ISO 8601.');
    }
    const inicio = new Date(inicioAt);
    const fim = new Date(inicio.getTime() + DURACAO_SLOT_MS);

    const horaLocal = Number(inicio.toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Maputo' }));
    if (horaLocal < HORA_ABERTURA || horaLocal >= HORA_FECHO) {
      throw erros.horarioInvalido(`Fora do horário da oficina (${HORA_ABERTURA}h–${HORA_FECHO}h).`);
    }
    if (fim.getTime() <= Date.now()) {
      throw erros.horarioInvalido('Não é possível agendar no passado.');
    }

    const veiculo = veiculoId ? await veiculoRepo.procurarPorId(veiculoId) : null;
    if (!veiculo || veiculo.utilizadorId !== utilizadorId) {
      throw erros.naoAutorizado();
    }

    const criado = await agendamentoRepo.criarCondicional({
      utilizadorId,
      veiculoId,
      inicioAt: inicio.toISOString(),
      fimAt: fim.toISOString(),
    });
    if (!criado) throw erros.slotIndisponivel();
    return criado;
  };
}