// RF05/RF10: mensagens por OS, só entre participantes.
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
const cliente = { nome: 'Cliente Chat', email: `chat${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cliente });
const cliLogin = await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } });
const cliToken = cliLogin.json.data.token;
const veiculo = await req('POST', '/veiculos', { token: cliToken, body: { matricula: 'CH' + ts, marca: 'Ford', modelo: 'Fiesta' } });
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

const os = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'OS para teste de mensagens' },
});
const osId = os.json.data.id;

// Outro cliente (não participante)
const outro = { nome: 'Intruso', email: `intr${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: outro });
const intrToken = (await req('POST', '/auth/login', { body: { identificador: outro.email, senha: outro.senha } })).json.data.token;

// 1. Cliente envia mensagem
const r1 = await req('POST', `/ordens/${osId}/mensagens`, { token: cliToken, body: { conteudo: 'Quando fica pronto o carro?' } });
check('RF05 cliente envia = 201', r1.status === 201 && r1.json.data.conteudo.startsWith('Quando'), JSON.stringify(r1.json?.data));

// 2. Staff responde
const r2 = await req('POST', `/ordens/${osId}/mensagens`, { token: adminToken, body: { conteudo: 'Fica pronto sexta-feira.' } });
check('RF10 staff responde = 201', r2.status === 201, r2.json?.data?.remetentePerfil);

// 3. Cliente lê o histórico (2 mensagens, em ordem)
const r3 = await req('GET', `/ordens/${osId}/mensagens`, { token: cliToken });
check('histórico = 2 mensagens ordenadas', r3.status === 200 && r3.json.data.length === 2 && r3.json.data[0].conteudo.startsWith('Quando'), `n=${r3.json?.data?.length}`);

// 4. Intruso não envia → 403
const r4 = await req('POST', `/ordens/${osId}/mensagens`, { token: intrToken, body: { conteudo: 'Olá!' } });
check('não participante enviar = 403', r4.status === 403);

// 5. Intruso não lê → 403
const r5 = await req('GET', `/ordens/${osId}/mensagens`, { token: intrToken });
check('não participante ler = 403', r5.status === 403);

// 6. Mensagem vazia → 422
const r6 = await req('POST', `/ordens/${osId}/mensagens`, { token: cliToken, body: { conteudo: '   ' } });
check('mensagem vazia = 422', r6.status === 422, r6.json?.error?.code);

// 7. Mensagem demasiado longa → 422
const r7 = await req('POST', `/ordens/${osId}/mensagens`, { token: cliToken, body: { conteudo: 'x'.repeat(2001) } });
check('mensagem > 2000 = 422', r7.status === 422);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);