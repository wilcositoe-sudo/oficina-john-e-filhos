import { criarRegistarVeiculo } from './use-cases/registar-veiculo.js';
import { criarListarVeiculosCliente } from './use-cases/listar-veiculos-cliente.js';
import { criarDetalheVeiculo } from './use-cases/detalhe-veiculo.js';
import { criarListarVeiculosPorCliente } from './use-cases/listar-veiculos-por-cliente.js';
import { criarAtualizarVeiculo } from './use-cases/atualizar-veiculo.js';

export function createVehicleDependencies({ requireAuth, requireRole, utilizadorRepo, veiculoRepo }) {
  return {
    requireAuth,
    requireRole,
    registar: criarRegistarVeiculo({ veiculoRepo }),
    listar: criarListarVeiculosCliente({ veiculoRepo }),
    detalhe: criarDetalheVeiculo({ veiculoRepo }),
    atualizar: criarAtualizarVeiculo({ veiculoRepo }),
    listarPorCliente: criarListarVeiculosPorCliente({ utilizadorRepo, veiculoRepo }),
  };
}
