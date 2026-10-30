// RF02: pedido → resposta staff → decisão cliente. State + RN01 + transação + RN05.
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

async function novoCliente(tag) {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const c = { nome: `Cliente ${tag}`, email: `${tag}${ts}@exemplo.com`, senha: 'senha1234' };
  const r = await req('POST', '/auth/register', { body: c });
  const l = await req('POST', '/auth/login', { body: { identificador: c.email, senha: c.senha } });
  return { token: l.json.data.token, id: l.json.data.utilizador.id };
}

const a = await novoCliente('qa');
const b = await novoCliente('qb');
const adminLogin = await req('POST', '/auth/login', { body: ADMIN });
const adminToken = adminLogin.json.data.token;

// Veículo de A via API
const v = await req('POST', '/veiculos', {
  token: a.token,
  body: { matricula: 'QRC' + Date.now(), marca: 'Mazda', modelo: 'Demio', ano: 2018 },
});
const veiculoA = v.json.data.id;
const veiculoB = (await req('POST', '/veiculos', { token: b.token, body: { matricula: 'QRB' + Date.now(), marca: 'Ford', modelo: 'Ranger' } })).json.data.id;

// 1. Pedido válido
const r1 = await req('POST', '/orcamentos', {
  token: a.token,
  body: { veiculoId: veiculoA, descricaoProblema: 'Ruído ao travar a fundo' },
});
check('RF02 pedido = 201', r1.status === 201 && r1.json.data.estado === 'SOLICITADO', JSON.stringify(r1.json?.data));
const orcId = r1.json?.data?.id;
check('numero ORC-AAAA-NNNNNN', /^ORC-\d{4}-\d{6}$/.test(r1.json?.data?.numero ?? ''), r1.json?.data?.numero);

// 2. Descrição curta (RN09) → 422
const r2 = await req('POST', '/orcamentos', { token: a.token, body: { veiculoId: veiculoA, descricaoProblema: 'curto' } });
check('RN09 descrição < 10 = 422', r2.status === 422, r2.json?.error?.code);

// 3. Veículo alheio (RN01) → 422
const r3 = await req('POST', '/orcamentos', { token: a.token, body: { veiculoId: veiculoB, descricaoProblema: 'Problema qualquer no motor' } });
check('RN01 veículo alheio recusado', r3.status === 422, r3.json?.error?.code);

// 4. Cliente B não vê orçamento de A
const r4 = await req('GET', '/orcamentos/meu', { token: b.token });
check('isolamento: B não vê orçamento de A', r4.json.data.length === 0);

// 5. Cliente não pode responder (staff only) → 403
const r5 = await req('POST', `/orcamentos/${orcId}/resposta`, { token: a.token, body: { itens: [{ descricao: 'X', precoUnitario: '1.00' }] } });
check('RF02 cliente responder = 403', r5.status === 403);

// 6. Staff responde com proposta (2 linhas: 100.00x2 + 50.00 = 250.00)
const r6 = await req('POST', `/orcamentos/${orcId}/resposta`, {
  token: adminToken,
  body: { itens: [
    { descricao: 'Pastilhas de travão', quantidade: 2, precoUnitario: '100.00' },
    { descricao: 'Mão de obra', quantidade: 1, precoUnitario: '50.00' },
  ] },
});
check('RF02 proposta ENVIADA', r6.status === 200 && r6.json.data.estado === 'ENVIADO', JSON.stringify(r6.json?.data));
check('RN05 total exato 250.00', r6.json?.data?.totalEstimado === '250.00', r6.json?.data?.totalEstimado);

// 7. Responder de novo → 409 (State)
const r7 = await req('POST', `/orcamentos/${orcId}/resposta`, { token: adminToken, body: { itens: [{ descricao: 'Y', precoUnitario: '1.00' }] } });
check('resposta dupla = 409 TRANSICAO_INVALIDA', r7.status === 409, r7.json?.error?.code);

// 8. Cliente B tenta decidir orçamento de A → 403
const r8 = await req('POST', `/orcamentos/${orcId}/decisao`, { token: b.token, body: { decisao: 'APROVAR' } });
check('RN01 decisão alheia = 403', r8.status === 403);

// 9. Dono A aprova (DEC-D10: fica APROVADO, sem OS automática)
const r9 = await req('POST', `/orcamentos/${orcId}/decisao`, { token: a.token, body: { decisao: 'APROVAR' } });
check('RF02 aprovação = APROVADO', r9.status === 200 && r9.json.data.estado === 'APROVADO', r9.json?.data?.estado);
check('DEC-D10 sem OS automática', !('ordemId' in (r9.json?.data ?? {})));

// 10. Decidir de novo → 409
const r10 = await req('POST', `/orcamentos/${orcId}/decisao`, { token: a.token, body: { decisao: 'REJEITAR' } });
check('decisão dupla = 409', r10.status === 409);

// 11. Orçamento inexistente → 404
const r11 = await req('POST', '/orcamentos/999999/resposta', { token: adminToken, body: { itens: [{ descricao: 'Z', precoUnitario: '1.00' }] } });
check('orçamento inexistente = 404', r11.status === 404);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);