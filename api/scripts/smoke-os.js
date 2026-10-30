// RF11/RN01/RN02/RN03/RN09: criação da OS com histórico e isolamento.
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
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const c = { nome: `Cliente ${tag}`, email: `${tag}${ts}@exemplo.com`, senha: 'senha1234' };
  await req('POST', '/auth/register', { body: c });
  const l = await req('POST', '/auth/login', { body: { identificador: c.email, senha: c.senha } });
  const tok = l.json.data.token;
  const v = await req('POST', '/veiculos', { token: tok, body: { matricula: 'OS' + ts, marca: 'VW', modelo: 'Golf' } });
  return { token: tok, email: c.email, veiculoId: v.json.data.id };
}

const a = await novoCliente('ca');
const b = await novoCliente('cb');
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// 1. Staff cria OS para o cliente A
const r1 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: a.email, veiculoId: a.veiculoId, descricaoProblema: 'Motor a falhar em aceleração' },
});
check('RF11 criação = 201', r1.status === 201, JSON.stringify(r1.json?.data));

const osId = r1.json?.data?.id;

// 2. RN02: nasce PENDENTE
check('RN02 estado inicial PENDENTE', r1.json?.data?.estado === 'PENDENTE', r1.json?.data?.estado);

// 3. Número no formato OS-AAAA-NNNNNN
check('numero OS-AAAA-NNNNNN', /^OS-\d{4}-\d{6}$/.test(r1.json?.data?.numeroOS ?? ''), r1.json?.data?.numeroOS);

// 4. Total inicial 0.00 (calculado no servidor — RN05)
const r4 = await req('GET', `/ordens/${osId}`, { token: adminToken });
check('valor_total inicial 0.00', r4.json?.data?.valorTotal === '0.00', r4.json?.data?.valorTotal);

// 5. RN09: descrição curta → 422
const r5 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: a.email, veiculoId: a.veiculoId, descricaoProblema: 'curta' },
});
check('RN09 descrição < 10 = 422', r5.status === 422, r5.json?.error?.code);

// 6. RN01: veículo de B com e-mail de A → 422
const r6 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: a.email, veiculoId: b.veiculoId, descricaoProblema: 'Problema qualquer na caixa' },
});
check('RN01 veículo não pertence ao cliente', r6.status === 422, r6.json?.error?.code);

// 7. Cliente não pode criar OS → 403
const r7 = await req('POST', '/ordens', {
  token: a.token,
  body: { emailCliente: a.email, veiculoId: a.veiculoId, descricaoProblema: 'Tentativa de criação cliente' },
});
check('cliente criar OS = 403', r7.status === 403);

// 8. RN03: histórico inicial registado
const r8 = await req('GET', `/ordens/${osId}/historico`, { token: adminToken });
check('RN03 histórico tem entrada inicial', r8.status === 200 && r8.json.data.length === 1 && r8.json.data[0].estadoNovo === 'PENDENTE', JSON.stringify(r8.json?.data));

// 9. Dono vê a OS em /ordens/meu
const r9 = await req('GET', '/ordens/meu', { token: a.token });
check('dono vê a sua OS', r9.json.data.some((o) => o.id === osId));

// 10. Cliente B não acede à OS de A → 403
const r10 = await req('GET', `/ordens/${osId}`, { token: b.token });
check('isolamento: B acede OS de A = 403', r10.status === 403);

// 11. OS inexistente → 404
const r11 = await req('GET', '/ordens/999999', { token: adminToken });
check('OS inexistente = 404', r11.status === 404);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);