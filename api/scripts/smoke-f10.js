// RF07 (entrega+taxa) + RF08/RF09 (avaliações) — DEC-D19/DEC-D20.
const BASE = 'http://localhost:3000/api/v1';
const ADMIN = { identificador: 'admin@exemplo.com', senha: 'admin1234' };
let falhas = 0;

async function req(metodo, caminho, { token, body } = {}) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

function check(nome, condicao, extra = '') {
  console.log(`${condicao ? 'PASS' : 'FAIL'} - ${nome}${extra ? ' | ' + extra : ''}`);
  if (!condicao) falhas++;
}

const ts = Date.now();
const cliente = { nome: 'Maria Silva', email: `f10${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cliente });
const cliToken = (await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } })).json.data.token;
const veiculo = await req('POST', '/veiculos', { token: cliToken, body: { matricula: 'F10' + ts, marca: 'Toyota', modelo: 'Corolla' } });
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

const servico = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Serviço F10', precoBase: 1000 } });
const os = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'OS para testes F10' },
});
const osId = os.json.data.id;
await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId: servico.json.data.id, quantidade: 1 } });

// 1. Cliente escolhe entrega ao domicílio → taxa 500, total 1500
const r1 = await req('POST', `/ordens/${osId}/entrega`, { token: cliToken, body: { modalidade: 'DOMICILIO' } });
check('RF07 domicílio taxa 500', r1.status === 200 && r1.json.data.taxaEntrega === '500.00' && r1.json.data.valorTotal === '1500.00', JSON.stringify(r1.json?.data));

// 2. Muda para levantamento → taxa 0, total 1000
const r2 = await req('POST', `/ordens/${osId}/entrega`, { token: cliToken, body: { modalidade: 'LEVANTAMENTO' } });
check('RF07 levantamento taxa 0', r2.json?.data?.taxaEntrega === '0.00' && r2.json?.data?.valorTotal === '1000.00', r2.json?.data?.valorTotal);

// 3. Modalidade inválida → 422
const r3 = await req('POST', `/ordens/${osId}/entrega`, { token: cliToken, body: { modalidade: 'CORREIO' } });
check('modalidade inválida = 422', r3.status === 422, r3.json?.error?.code);

// 4. DEC-D20: avaliar antes de entregar → 409
const r4 = await req('POST', `/ordens/${osId}/avaliacoes`, { token: cliToken, body: { classificacao: 5, comentario: 'Ótimo serviço' } });
check('avaliar antes de entrega = 409', r4.status === 409 && r4.json.error.code === 'OS_NAO_ELEGIVEL_AVALIACAO', r4.json?.error?.code);

// 5. Concluir + pagar + entregar
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });
await req('POST', `/ordens/${osId}/pagamentos`, { token: adminToken, body: { metodo: 'PRESENCIAL', valor: '1000.00', idempotencyKey: `f10-${ts}` } });
const r5 = await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'entregar' } });
check('F10 entregar = ENTREGUE', r5.status === 200 && r5.json.data.estado === 'ENTREGUE', r5.json?.data?.estado);

// 6. Cliente avalia (RF08) → 201
const r6 = await req('POST', `/ordens/${osId}/avaliacoes`, { token: cliToken, body: { classificacao: 5, comentario: 'Serviço excelente e rápido!' } });
check('RF08 avaliar = 201', r6.status === 201 && r6.json.data.classificacao === 5, JSON.stringify(r6.json?.data));

// 7. Duplicada → 409
const r7 = await req('POST', `/ordens/${osId}/avaliacoes`, { token: cliToken, body: { classificacao: 4 } });
check('avaliação duplicada = 409', r7.status === 409 && r7.json.error.code === 'AVALIACAO_EXISTENTE', r7.json?.error?.code);

// 8. OS2 conduzida até ENTREGUE; nota fora da escala → 422
const os2 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'Segunda OS F10' },
});
const os2Id = os2.json.data.id;
await req('POST', `/ordens/${os2Id}/servicos`, { token: adminToken, body: { servicoId: servico.json.data.id, quantidade: 1 } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });
await req('POST', `/ordens/${os2Id}/pagamentos`, { token: adminToken, body: { metodo: 'PRESENCIAL', valor: '1000.00', idempotencyKey: `f10b-${ts}` } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'entregar' } });
const r8 = await req('POST', `/ordens/${os2Id}/avaliacoes`, { token: cliToken, body: { classificacao: 7 } });
check('nota fora de escala = 422', r8.status === 422, r8.json?.error?.code);

// 9. Intruso avalia OS alheia → 403
const intruso = { nome: 'Outro', email: `intr${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: intruso });
const intrToken = (await req('POST', '/auth/login', { body: { identificador: intruso.email, senha: intruso.senha } })).json.data.token;
const r9 = await req('POST', `/ordens/${osId}/avaliacoes`, { token: intrToken, body: { classificacao: 1 } });
check('avaliação alheia = 403', r9.status === 403);

// 10. RF09: lista pública contém a avaliação, sem dados privados
const r10 = await req('GET', '/avaliacoes');
const av = r10.json.data.find((a) => a.clienteNome === 'Maria');
check('RF09 lista pública inclui avaliação', r10.status === 200 && !!av, `total=${r10.json?.data?.length}`);
check('RF09 só primeiro nome, sem e-mail/telefone', !!av && !('email' in av) && !('telefone' in av) && av.clienteNome === 'Maria', av?.clienteNome);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);