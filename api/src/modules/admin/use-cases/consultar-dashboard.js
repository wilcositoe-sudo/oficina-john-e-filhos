import { DomainError } from '../../../shared/errors/domain-error.js';

export function criarConsultarDashboard({ dashboardRepo }) {
  return async function consultarDashboard({ inicio, fim }) {
    const agora = new Date();
    const fimDate = fim && !Number.isNaN(Date.parse(fim)) ? new Date(fim) : agora;
    const inicioDate = inicio && !Number.isNaN(Date.parse(inicio))
      ? new Date(inicio)
      : new Date(fimDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (inicioDate >= fimDate) {
      throw new DomainError('PERIODO_INVALIDO', 'O início do período tem de ser anterior ao fim.', 422);
    }
    return dashboardRepo.consultar({ inicio: inicioDate.toISOString(), fim: fimDate.toISOString() });
  };
}