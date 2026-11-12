import { DomainError } from '../../../shared/errors/domain-error.js';

export function criarConsultarDashboard({ dashboardRepo }) {
  return async function consultarDashboard({ inicio, fim }) {
    const agora = new Date();
    const converterData = (valor, campo) => {
      if (valor === undefined || valor === null) return null;
      const data = new Date(valor);
      if (Number.isNaN(data.getTime())) {
        throw new DomainError('PERIODO_INVALIDO', `A data "${campo}" é inválida.`, 422, { campo });
      }
      return data;
    };
    const fimDate = converterData(fim, 'fim') ?? agora;
    const inicioDate = converterData(inicio, 'inicio')
      ?? new Date(fimDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (inicioDate >= fimDate) {
      throw new DomainError('PERIODO_INVALIDO', 'O início do período tem de ser anterior ao fim.', 422);
    }
    return dashboardRepo.consultar({ inicio: inicioDate.toISOString(), fim: fimDate.toISOString() });
  };
}