// RN01: veículos do cliente — criação, titularidade e isolamento entre clientes.
const BASE = 'http://localhost:3000/api/v1';
let falhas = 0;

async function req(metodo, caminho, { token, body } = {}) {
  const res = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
  const ts = Date.now();
  const c = { nome: `Cliente ${tag}`, email: `${tag}${ts}@exemplo.com`, senha: 'senha1234' };
  await req('POST', '/auth/register', { body: c });
  const l = await req('POST', '/auth/login', { body: { identificador: c.email, senha: c.senha } });
  return { token: l.json.data.token, email: c.email };
}

const a = await novoCliente('a');
const b = await novoCliente('b');

// 1. Cliente A regista veículo
const r1 = await req('POST', '/veiculos', {
  token: a.token,
  body: { matricula: 'MTZ 123 AB', marca: 'Toyota', modelo: 'Corolla', ano: 2019 },
});
check('registo de veículo = 201', r1.status === 201, JSON.stringify(r1.json?.data));
const veiculoA = r1.json?.data?.id;

// 2. Matrícula normalizada (maiúsculas, sem espaços)
check('matrícula normalizada', r1.json?.data?.matricula === 'MTZ123AB', r1.json?.data?.matricula);

// 3. Cliente A lista — vê o seu
const r2 = await req('GET', '/veiculos', { token: a.token });
check('listagem própria tem 1 veículo', r2.status === 200 && r2.json.data.length === 1);

// 4. Cliente B lista — não vê nada do A
const r3 = await req('GET', '/veiculos', { token: b.token });
check('isolamento: cliente B não vê veículos do A', r3.json.data.length === 0);

// 5. Cliente B tenta aceder ao veículo do A → 403 (RN01)
const r4 = await req('GET', `/veiculos/${veiculoA}`, { token: b.token });
check('RN01: acesso alheio = 403', r4.status === 403, r4.json?.error?.code);

// 6. Cliente A acede ao seu
const r5 = await req('GET', `/veiculos/${veiculoA}`, { token: a.token });
check('dono acede ao seu veículo', r5.status === 200);

// 7. Matrícula duplicada → 409
const r6 = await req('POST', '/veiculos', {
  token: a.token,
  body: { matricula: 'mtz 123 ab', marca: 'Ford', modelo: 'Focus' },
});
check('matrícula duplicada = 409', r6.status === 409, r6.json?.error?.code);

// 8. Ano inválido → 422
const r7 = await req('POST', '/veiculos', {
  token: a.token,
  body: { matricula: 'MTZ999ZZ', marca: 'Ford', modelo: 'Focus', ano: 1800 },
});
check('ano inválido = 422', r7.status === 422, r7.json?.error?.code);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);