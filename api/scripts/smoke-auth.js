// Teste manual de fumo da F4. Requer a API no ar: npm run dev --workspace=api
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
  try { json = await res.json(); } catch { /* 204 sem corpo */ }
  return { status: res.status, json };
}

function check(nome, condicao, extra = '') {
  console.log(`${condicao ? 'PASS' : 'FAIL'} - ${nome}${extra ? ' | ' + extra : ''}`);
  if (!condicao) falhas++;
}

const email = `teste${Date.now()}@exemplo.com`;
const senha = 'senha1234';
const nome = 'Cliente Teste';

// 1. Registo
const r1 = await req('POST', '/auth/register', { body: { nome, email, senha } });
check('RF20 registo devolve 201', r1.status === 201, JSON.stringify(r1.json));
check('RF20 perfil é CLIENTE', r1.json?.data?.perfil === 'CLIENTE');

// 2. Duplicado
const r2 = await req('POST', '/auth/register', { body: { nome, email, senha } });
check('RF20 duplicado devolve 409', r2.status === 409, r2.json?.error?.code);

// 3. Login errado (RF19: erro genérico, não revela existência)
const r3 = await req('POST', '/auth/login', { body: { identificador: email, senha: 'errada123' } });
check('RF19 senha errada = 401', r3.status === 401, r3.json?.error?.message);

// 4. Login certo
const r4 = await req('POST', '/auth/login', { body: { identificador: email, senha } });
check('RF19 login devolve token', r4.status === 200 && !!r4.json?.data?.token);
const token = r4.json?.data?.token;

// 5. /me com token
const r5 = await req('GET', '/auth/me', { token });
check('RF19 /me devolve o próprio utilizador', r5.status === 200 && r5.json?.data?.email === email);

// 6. /me sem token
const r6 = await req('GET', '/auth/me');
check('RF19 /me sem token = 401', r6.status === 401);

// 7. Logout
const r7 = await req('POST', '/auth/logout', { token });
check('logout devolve 204', r7.status === 204);

// 8. Token revogado
const r8 = await req('GET', '/auth/me', { token });
check('token revogado = 401', r8.status === 401);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);