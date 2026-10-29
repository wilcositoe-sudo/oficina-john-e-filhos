// RF01 + RBAC: catálogo público e gestão por staff, testado 100% pela API.
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

// Credenciais admin (bootstrap) e cliente (criado via API)
const ts = Date.now();
const ADMIN = { identificador: 'admin@exemplo.com', senha: 'admin1234' };
const cliente = { nome: 'Cliente Catálogo', email: `cli${ts}@exemplo.com`, senha: 'senha1234' };

// 1. Admin faz login (conta criada pelo bootstrap)
const la = await req('POST', '/auth/login', { body: ADMIN });
check('admin consegue fazer login', la.status === 200 && !!la.json?.data?.token, la.json?.error?.code);
const adminToken = la.json?.data?.token;

// 2. Cliente regista-se e faz login via API
const rc = await req('POST', '/auth/register', { body: cliente });
const lc = await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } });
const clienteToken = lc.json?.data?.token;
check('cliente criado e autenticado via API', rc.status === 201 && lc.status === 200);

// 3. Cliente tenta criar serviço → 403 (RBAC)
const r1 = await req('POST', '/servicos', { token: clienteToken, body: { nome: 'X', precoBase: 1 } });
check('RBAC: cliente criar serviço = 403', r1.status === 403, r1.json?.error?.code);

// 4. Sem sessão → 401
const r2 = await req('POST', '/servicos', { body: { nome: 'X', precoBase: 1 } });
check('sem sessão criar serviço = 401', r2.status === 401);

// 5. Admin cria serviço via API → grava na BD
const r3 = await req('POST', '/servicos', {
  token: adminToken,
  body: { codigo: `SV-${ts}`, nome: 'Serviço Teste API', descricao: 'Criado via API', precoBase: 1800.5 },
});
check('admin cria serviço = 201', r3.status === 201, JSON.stringify(r3.json?.data));
const servicoId = r3.json?.data?.id;

// 6. Preço persistido como string decimal exata (RN05)
check('RN05 preço é string decimal', typeof r3.json?.data?.precoBase === 'string', r3.json?.data?.precoBase);

// 7. Catálogo público mostra o serviço ativo
const r4 = await req('GET', '/servicos');
const aparece = r4.json?.data?.some((s) => s.id === servicoId);
check('RF01 catálogo público inclui serviço ativo', r4.status === 200 && aparece);

// 8. Admin desativa → desaparece do catálogo público
await req('PATCH', `/servicos/${servicoId}/desativar`, { token: adminToken });
const r5 = await req('GET', '/servicos');
const sumiu = !r5.json?.data?.some((s) => s.id === servicoId);
check('RF01 serviço inativo não é oferecido', sumiu);

// 9. Validacao: preço negativo → 422
const r6 = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Y', precoBase: -5 } });
check('preço negativo = 422', r6.status === 422, r6.json?.error?.code);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);