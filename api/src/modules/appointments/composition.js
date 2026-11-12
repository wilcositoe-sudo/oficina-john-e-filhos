import { criarPgAgendamentoRepository } from './adapters/pg-agendamento-repository.js';
import { criarConsultarDisponibilidade } from './use-cases/consultar-disponibilidade.js';
import { criarAgendarDiagnostico } from './use-cases/agendar-diagnostico.js';
import { criarCancelarAgendamento } from './use-cases/cancelar-agendamento.js';
import { criarListarMeusAgendamentos } from './use-cases/listar-meus-agendamentos.js';
import { criarListarAgendamentosStaff } from './use-cases/listar-agendamentos-staff.js';

export function createAppointmentsDependencies({ requireAuth, requireRole, veiculoRepo }) {
  const agendamentoRepo = criarPgAgendamentoRepository();
  return {
    requireAuth,
    requireRole,
    disponibilidade: criarConsultarDisponibilidade({ agendamentoRepo }),
    agendar: criarAgendarDiagnostico({
      agendamentoRepo,
      veiculoRepo,
    }),
    cancelar: criarCancelarAgendamento({ agendamentoRepo }),
    listarMeus: criarListarMeusAgendamentos({ agendamentoRepo }),
    listarStaff: criarListarAgendamentosStaff({ agendamentoRepo }),
  };
}
