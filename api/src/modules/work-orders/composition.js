import { criarCriarOS } from './use-cases/criar-os.js';
import { criarListarOsStaff } from './use-cases/listar-os-staff.js';
import { criarDetalheOs } from './use-cases/detalhe-os.js';
import { criarTransitarOs } from './use-cases/transitar-os.js';
import { criarAdicionarServico } from './use-cases/adicionar-servico.js';
import { criarAdicionarPeca } from './use-cases/adicionar-peca.js';
import { criarListarHistoricoOs } from './use-cases/listar-historico-os.js';
import { criarListarMinhasOs } from './use-cases/listar-minhas-os.js';
import { criarEscolherEntrega } from './use-cases/escolher-entrega.js';
import { criarAtribuirMecanico } from './use-cases/atribuir-mecanico.js';
import { criarSubmeterDiagnostico } from './use-cases/submeter-diagnostico.js';
import { criarPrecificarOS } from './use-cases/precificar-os.js';
import { criarDecisaoCliente } from './use-cases/decisao-cliente.js';
import { criarValidarRevisao } from './use-cases/validar-revisao.js';
import { criarIniciarDiagnostico } from './use-cases/iniciar-diagnostico.js';
import { criarConcluirReparacao } from './use-cases/concluir-reparacao.js';
import { criarIniciarReparacao } from './use-cases/iniciar-reparacao.js';
import { criarRegistarNovaNecessidade } from './use-cases/registar-nova-necessidade.js';
import { criarListarOsMecanico } from './use-cases/listar-os-mecanico.js';
import { criarListarLinhasOs } from './use-cases/listar-linhas-os.js';
import { criarListarChecklistOs } from './use-cases/listar-checklist-os.js';
import { criarTransitarOsStaff } from './use-cases/transitar-os-staff.js';
import { criarListarMecanicos } from './use-cases/listar-mecanicos.js';

export function createWorkOrdersDependencies({
  requireAuth,
  requireRole,
  utilizadorRepo,
  osRepo,
  clienteRepo,
  veiculoRepo,
  servicoRepo,
  pecaRepo,
}) {
  const transitarOs = criarTransitarOs({ osRepo });

  return {
    utilizadorRepo,
    requireAuth,
    requireRole,
    criarOS: criarCriarOS({ osRepo, utilizadorRepo, clienteRepo, veiculoRepo }),
    listarOsStaff: criarListarOsStaff({ osRepo }),
    detalheOs: criarDetalheOs({ osRepo }),
    transitarOs,
    transitarOsStaff: criarTransitarOsStaff({ osRepo, transitarOs }),
    adicionarServico: criarAdicionarServico({ osRepo }),
    adicionarPeca: criarAdicionarPeca({ osRepo }),
    listarHistoricoOs: criarListarHistoricoOs({ osRepo }),
    listarMinhasOs: criarListarMinhasOs({ osRepo }),
    listarOsMecanico: criarListarOsMecanico({ osRepo }),
    listarLinhasOs: criarListarLinhasOs({ osRepo }),
    listarChecklistOs: criarListarChecklistOs({ osRepo }),
    listarMecanicos: criarListarMecanicos({ utilizadorRepo }),
    escolherEntrega: criarEscolherEntrega({ osRepo }),
    atribuirMecanico: criarAtribuirMecanico({ osRepo, utilizadorRepo }),
    submeterDiagnostico: criarSubmeterDiagnostico({ osRepo, servicoRepo, pecaRepo }),
    precificarOS: criarPrecificarOS({ osRepo }),
    decisaoCliente: criarDecisaoCliente({ osRepo, clienteRepo }),
    validarRevisao: criarValidarRevisao({ osRepo }),
    iniciarDiagnostico: criarIniciarDiagnostico({ osRepo }),
    concluirReparacao: criarConcluirReparacao({ osRepo }),
    iniciarReparacao: criarIniciarReparacao({ osRepo }),
    registarNovaNecessidade: criarRegistarNovaNecessidade({ osRepo, servicoRepo, pecaRepo }),
  };
}
