// RF12 + Doc 09 §9.6: débito de stock condicional, sem corrida.
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
const cliente = { nome: 'Cliente Pecas', email: `pecas${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cliente });
const cliLogin = await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } });
const cliToken = cliLogin.json.data.token;
const veiculo = await req('POST', '/veiculos', { token: cliToken, body: { matricula: 'PC' + ts, marca: 'Toyota', modelo: 'Corolla' } });
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// 1. Cria peça com stock 5 a 250.00
const r1 = await req('POST', '/pecas', {
  token: adminToken,
  body: { nome: 'Pastilhas de travão', precoUnitario: '250.00', quantidadeStock: 5 },
});
check('criar peça = 201', r1.status === 201 && r1.json.data.quantidadeStock === 5, JSON.stringify(r1.json?.data));
const pecaId = r1.json?.data?.id;

// 2. Cliente não cria peça → 403
const r2 = await req('POST', '/pecas', { token: cliToken, body: { nome: 'X', precoUnitario: '1.00' } });
check('cliente criar peça = 403', r2.status === 403);

// 3. Preço inválido / stock negativo → 422
const r3 = await req('POST', '/pecas', { token: adminToken, body: { nome: 'Y', precoUnitario: 'abc' } });
check('preço inválido = 422', r3.status === 422);
const r3b = await req('POST', '/pecas', { token: adminToken, body: { nome: 'Y', precoUnitario: '1.00', quantidadeStock: -1 } });
check('stock negativo = 422', r3b.status === 422);

// 4. OS + lança 3 unidades → ok, total inclui peça
const os = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'Substituição de pastilhas' },
});
const osId = os.json.data.id;
const r4 = await req('POST', `/ordens/${osId}/pecas`, { token: adminToken, body: { pecaId, quantidade: 3 } });
check('lançar 3 peças = 201', r4.status === 201 && r4.json.data.subtotal === '750.00', JSON.stringify(r4.json?.data));
check('total da OS 750.00', r4.json?.data?.valorTotal === '750.00');

// 5. Stock desceu para 2
const r5 = await req('GET', '/pecas', { token: adminToken });
const pecaAgora = r5.json.data.find((p) => p.id === pecaId);
check('stock descontado para 2', pecaAgora?.quantidadeStock === 2, `stock=${pecaAgora?.quantidadeStock}`);

// 6. Pedir 5 (só há 2) → 409 STOCK_INSUFICIENTE e stock inalterado
const r6 = await req('POST', `/ordens/${osId}/pecas`, { token: adminToken, body: { pecaId, quantidade: 5 } });
check('stock insuficiente = 409', r6.status === 409 && r6.json.error.code === 'STOCK_INSUFICIENTE', r6.json?.error?.code);
const r6b = await req('GET', '/pecas', { token: adminToken });
check('stock inalterado após recusa', r6b.json.data.find((p) => p.id === pecaId)?.quantidadeStock === 2);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);