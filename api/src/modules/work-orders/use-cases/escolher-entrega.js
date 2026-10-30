import { erros } from '../../../shared/errors/domain-error.js';
import { podeEditar } from '../domain/estados.js';

// DEC-D19: taxa fixa de domicílio (proposta AC-07 — validar com a oficina).
// Escolha só antes de concluir: a taxa entra no total (RN05) e fica persistida.
const TAXA_DOMICILIO = '500.00';
const TAXA_LEVANTAMENTO = '0.00';

export function criarEscolherEntrega({ osRepo }) {
  return async function escolherEntrega({ ordemId, utilizador, modalidade }) {
    if (!['LEVANTAMENTO', 'DOMICILIO'].includes(modalidade)) throw erros.modalidadeInvalida();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && os.utilizadorId !== utilizador.id) throw erros.naoAutorizado();
    if (!podeEditar(os.estado)) throw erros.transicaoInvalida(os.estado);

    const taxa = modalidade === 'DOMICILIO' ? TAXA_DOMICILIO : TAXA_LEVANTAMENTO;
    return osRepo.definirEntrega({ ordemId, modalidade, taxaEntrega: taxa });
  };
}