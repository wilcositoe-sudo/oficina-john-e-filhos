import { DomainError, erros } from '../../../shared/errors/domain-error.js';
import { mesmaId } from '../../../shared/id.js';

const LIMITE_CARACTERES = 2000;

const erroValidacao = (campo, msg) =>
  new DomainError('VALIDACAO', `Campo inválido: ${campo}. ${msg}`, 422, { campo });

// RF05/RF10: mensagem ligada à OS; só participantes autorizados (dono ou staff).
export function criarEnviarMensagem({ mensagemRepo, osRepo }) {
  return async function enviarMensagem({ ordemId, remetente, conteudo }) {
    const os = await osRepo.procurarPorId(ordemId);
    if (!os) throw erros.osNaoEncontrada();

    const isStaff = ['FUNCIONARIO', 'ADMINISTRADOR'].includes(remetente.perfil);
    const isMecanicoResponsavel = remetente.perfil === 'MECANICO'
      && mesmaId(os.mecanicoId, remetente.id);
    if (!isStaff && !isMecanicoResponsavel && !mesmaId(os.utilizadorId, remetente.id)) {
      throw erros.naoAutorizado();
    }

    const texto = conteudo?.trim() ?? '';
    if (texto.length === 0) throw erroValidacao('conteudo', 'A mensagem não pode ser vazia.');
    if (texto.length > LIMITE_CARACTERES) {
      throw erroValidacao('conteudo', `Máximo ${LIMITE_CARACTERES} caracteres.`);
    }

    return mensagemRepo.criar({ ordemId, remetenteId: remetente.id, conteudo: texto });
  };
}