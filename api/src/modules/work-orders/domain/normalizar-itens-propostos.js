function numero(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function texto(v) {
  return String(v ?? '').trim();
}

export async function normalizarItensPropostos({
  tipo,
  itens,
  catalogRepo,
}) {
  if (!Array.isArray(itens)) return [];

  const validados = [];

  for (const item of itens) {
    const quantidade = Math.max(1, Math.trunc(numero(item.quantidade, 1)));
    const id = item.id == null ? null : Number(item.id);

    // Item do catálogo
    if (id != null && Number.isFinite(id)) {
      const catalog =
        tipo === 'SERVICO'
          ? await catalogRepo.obterServicoPorId?.(id)
          : await catalogRepo.obterPecaPorId?.(id);

      if (!catalog) {
        throw new Error(
          tipo === 'SERVICO'
            ? `Serviço com id ${id} não encontrado.`
            : `Peça com id ${id} não encontrada.`,
        );
      }

      const precoCatalogo = numero(
        catalog.preco ?? catalog.preco_base ?? catalog.preco_unitario,
        0,
      );

      // O mecânico pode propor preço diferente? Para segurança, usamos o preço do catálogo,
      // excepto se o backend permitir override. Aqui mantemos preço do catálogo.
      validados.push({
        tipo,
        origem: 'CATALOGO',
        catalogoId: id,
        nome: catalog.nome,
        precoUnitario: precoCatalogo,
        quantidade,
        subtotal: precoCatalogo * quantidade,
      });

      continue;
    }

    // Item personalizado
    const nome = texto(item.nome);
    const preco = Math.max(0, numero(item.preco, 0));

    if (!nome) {
      throw new Error(
        tipo === 'SERVICO'
          ? 'Há um serviço personalizado sem nome.'
          : 'Há uma peça personalizada sem nome.',
      );
    }

    validados.push({
      tipo,
      origem: 'CUSTOM',
      catalogoId: null,
      nome,
      precoUnitario: preco,
      quantidade,
      subtotal: preco * quantidade,
    });
  }

  return validados;
}

export function somarItensPropostos(itens) {
  return itens.reduce((soma, i) => soma + numero(i.subtotal, 0), 0);
}