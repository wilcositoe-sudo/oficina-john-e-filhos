export function criarListarChecklistOs({ osRepo }) {
  return function listarChecklistOs({ ordemId }) {
    return osRepo.listarChecklist(ordemId);
  };
}
