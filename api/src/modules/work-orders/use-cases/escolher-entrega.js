import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

// DEC-D19: taxa fixa de domicílio (proposta AC-07 — validar com a oficina).
// A escolha é feita após a conclusão técnica, antes do pagamento.
const TAXA_DOMICILIO = '500.00';
const TAXA_LEVANTAMENTO = '0.00';

export function criarEscolherEntrega({ osRepo }) {
  return async function escolherEntrega({
    ordemId,
    utilizador,
    modalidade,
    enderecoEntrega,
    lat,
    lng,
  }) {
    if (!['LEVANTAMENTO', 'DOMICILIO'].includes(modalidade)) throw erros.modalidadeInvalida();

    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(utilizador.perfil);
    if (!isStaff && !mesmaId(os.utilizadorId, utilizador.id)) throw erros.naoAutorizado();
    if (os.estado !== 'CONCLUIDA') throw erros.transicaoInvalida(os.estado);

    const endereco = String(enderecoEntrega ?? '').trim();
    const latitude = lat === null || lat === undefined || lat === '' ? null : Number(lat);
    const longitude = lng === null || lng === undefined || lng === '' ? null : Number(lng);
    if (modalidade === 'DOMICILIO' && !endereco) {
      throw new DomainError('VALIDACAO', 'Indique o endereço de entrega ao domicílio.', 422, { campo: 'enderecoEntrega' });
    }
    if (
      (latitude === null) !== (longitude === null)
      || (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90))
      || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))
    ) {
      throw new DomainError('VALIDACAO', 'As coordenadas da entrega são inválidas.', 422, { campo: 'coordenadas' });
    }

    const taxa = modalidade === 'DOMICILIO' ? TAXA_DOMICILIO : TAXA_LEVANTAMENTO;
    const atualizada = await osRepo.definirEntrega({
      ordemId,
      estadoEsperado: os.estado,
      modalidade,
      taxaEntrega: taxa,
      enderecoEntrega: modalidade === 'DOMICILIO' ? endereco : null,
      entregaLat: modalidade === 'DOMICILIO' ? latitude : null,
      entregaLng: modalidade === 'DOMICILIO' ? longitude : null,
    });
    if (!atualizada) throw erros.transicaoInvalida(os.estado);
    return atualizada;
  };
}