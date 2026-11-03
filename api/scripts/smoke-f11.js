// RF15 (contas internas + último admin) + RF16/RF17 (dashboard com fórmulas).
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
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// 1. Cliente não acede à administração → 403
const cli = { nome: 'Cli F11', email: `f11${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cli });
const cliToken = (await req('POST', '/auth/login', { body: { identificador: cli.email, senha: cli.senha } })).json.data.token;
const r0 = await req('GET', '/admin/utilizadores', { token: cliToken });
check('cliente admin = 403', r0.status === 403);

// 2. Cria funcionário (RF15) → 201; login do funcionário funciona
const funcEmail = `func${ts}@exemplo.com`;
const r1 = await req('POST', '/admin/utilizadores', {
  token: adminToken,
  body: { nome: 'Funcionário Teste', email: funcEmail, senha: 'func1234', perfil: 'FUNCIONARIO' },
});
check('RF15 criar funcionário = 201', r1.status === 201 && r1.json.data.perfil === 'FUNCIONARIO', JSON.stringify(r1.json?.data));
const funcId = r1.json?.data?.id;
const r1b = await req('POST', '/auth/login', { body: { identificador: funcEmail, senha: 'func1234' } });
check('login do funcionário = 200', r1b.status === 200);

// 3. E-mail duplicado → 409
const r2 = await req('POST', '/admin/utilizadores', {
  token: adminToken,
  body: { nome: 'Duplicado', email: funcEmail, senha: 'func1234', perfil: 'FUNCIONARIO' },
});
check('e-mail duplicado = 409', r2.status === 409, r2.json?.error?.code);

// 4. Perfil inválido → 422
const r3 = await req('POST', '/admin/utilizadores', {
  token: adminToken,
  body: { nome: 'X', email: `x${ts}@exemplo.com`, senha: 'func1234', perfil: 'CLIENTE' },
});
check('perfil inválido = 422', r3.status === 422, r3.json?.error?.code);

// 5. Admin desativa o funcionário → login passa a 401
const r4 = await req('PATCH', `/admin/utilizadores/${funcId}`, { token: adminToken, body: { ativo: false } });
check('desativar funcionário', r4.status === 200 && r4.json.data.ativo === false);
const r4b = await req('POST', '/auth/login', { body: { identificador: funcEmail, senha: 'func1234' } });
check('login desativado = 401', r4b.status === 401);

// 6. Guarda do último admin: criar 2º admin, desativá-lo OK; desativar o ÚLTIMO → 409
const adm2 = await req('POST', '/admin/utilizadores', {
  token: adminToken,
  body: { nome: 'Admin Secundário', email: `adm2${ts}@exemplo.com`, senha: 'adm12345', perfil: 'ADMINISTRADOR' },
});
const adm2Id = adm2.json.data.id;
const r5 = await req('PATCH', `/admin/utilizadores/${adm2Id}`, { token: adminToken, body: { ativo: false } });
check('desativar 2º admin OK', r5.status === 200);

// Descobrir o id do admin principal pela lista
const lista = await req('GET', '/admin/utilizadores', { token: adminToken });
const adminPrincipal = lista.json.data.find((u) => u.email === ADMIN.identificador);
const outrosAtivos = lista.json.data.filter((u) => u.perfil === 'ADMINISTRADOR' && u.ativo && u.id !== adminPrincipal.id);
if (outrosAtivos.length === 0) {
  // Só existe o admin principal ativo → a guarda tem de disparar
  const r6 = await req('PATCH', `/admin/utilizadores/${adminPrincipal.id}`, { token: adminToken, body: { ativo: false } });
  check('RF15 último admin = 409', r6.status === 409 && r6.json.error.code === 'ULTIMO_ADMIN_ATIVO', r6.json?.error?.code);
} else {
  check('RF15 último admin = 409 (condição prévia: outros admins ativos existem — rever)', false, `outros=${outrosAtivos.length}`);
}

// 7. Dashboard (RF16/RF17) — default últimos 30 dias
const r7 = await req('GET', '/admin/dashboard', { token: adminToken });
check('dashboard = 200 com estrutura', r7.status === 200
  && typeof r7.json.data.totalOS === 'number'
  && typeof r7.json.data.osPorEstado === 'object'
  && typeof r7.json.data.faturacaoTotal === 'string'
  && Array.isArray(r7.json.data.servicosMaisSolicitados), JSON.stringify(r7.json?.data)?.slice(0, 140));

// 8. Fórmula de faturação: casa com a soma de confirmados feita pelo smoke-pagamentos
check('faturação é string decimal', /^\d+(\.\d{2})?$/.test(r7.json.data.faturacaoTotal), r7.json?.data?.faturacaoTotal);

// 9. Funcionário não vê dashboard → 403
const funcToken2 = (await req('POST', '/admin/utilizadores', {
  token: adminToken,
  body: { nome: 'Func 2', email: `func2${ts}@exemplo.com`, senha: 'func1234', perfil: 'FUNCIONARIO' },
})).json.data;
const r9 = await req('GET', '/admin/dashboard', { token: (await req('POST', '/auth/login', { body: { identificador: `func2${ts}@exemplo.com`, senha: 'func1234' } })).json.data.token });
check('funcionário dashboard = 403', r9.status === 403);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);