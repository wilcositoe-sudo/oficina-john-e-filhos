// RF03: slots → reserva com anti-corrida → cancelamento com regras.
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

// Amanhã em Maputo (YYYY-MM-DD)
const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' });
const slot9 = `${amanha}T09:00:00+02:00`;
const slot10 = `${amanha}T10:00:00+02:00`;

async function novoCliente(tag) {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  const c = { nome: `Cliente ${tag}`, email: `${tag}${ts}@exemplo.com`, senha: 'senha1234' };
  await req('POST', '/auth/register', { body: c });
  const l = await req('POST', '/auth/login', { body: { identificador: c.email, senha: c.senha } });
  const tok = l.json.data.token;
  const v = await req('POST', '/veiculos', { token: tok, body: { matricula: 'AG' + ts, marca: 'Nissan', modelo: 'March' } });
  return { token: tok, veiculoId: v.json.data.id };
}

const a = await novoCliente('aa');
const b = await novoCliente('ab');
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// 1. Disponibilidade de amanhã: 9 slots (08h–16h), todos livres
const r1 = await req('GET', `/agendamentos/disponibilidade?data=${amanha}`, { token: a.token });
check('RF03 disponibilidade = 9 slots', r1.json?.data?.slots?.length === 9, `slots=${r1.json?.data?.slots?.length}`);
check('todos livres inicialmente', r1.json.data.slots.every((s) => s.disponivel));

// 2. A agenda 09:00
const r2 = await req('POST', '/agendamentos', { token: a.token, body: { veiculoId: a.veiculoId, inicioAt: slot9 } });
check('reserva = 201 CONFIRMADO', r2.status === 201 && r2.json.data.estado === 'CONFIRMADO', JSON.stringify(r2.json?.data));
const agA = r2.json?.data?.id;

// 3. B tenta o MESMO slot → 409 (anti-corrida / revalidação no ato)
const r3 = await req('POST', '/agendamentos', { token: b.token, body: { veiculoId: b.veiculoId, inicioAt: slot9 } });
check('slot ocupado = 409 SLOT_INDISPONIVEL', r3.status === 409 && r3.json.error.code === 'SLOT_INDISPONIVEL', r3.json?.error?.code);

// 4. Disponibilidade agora mostra 09:00 ocupado
const r4 = await req('GET', `/agendamentos/disponibilidade?data=${amanha}`, { token: b.token });
const slot9State = r4.json.data.slots.find((s) => s.inicioAt === new Date(slot9).toISOString());
check('09:00 aparece ocupado', slot9State?.disponivel === false);

// 5. B agenda 10:00 — ok
const r5 = await req('POST', '/agendamentos', { token: b.token, body: { veiculoId: b.veiculoId, inicioAt: slot10 } });
check('B agenda 10:00', r5.status === 201, JSON.stringify(r5.json?.data));
const agB = r5.json?.data?.id;

// 6. RN01: B não pode cancelar agendamento de A → 403
const r6 = await req('POST', `/agendamentos/${agA}/cancelar`, { token: b.token });
check('cancelamento alheio = 403', r6.status === 403);

// 7. A cancela o seu → CANCELADO, slot volta a ficar livre
const r7 = await req('POST', `/agendamentos/${agA}/cancelar`, { token: a.token });
check('cancelamento próprio = CANCELADO', r7.status === 200 && r7.json.data.estado === 'CANCELADO');
const r7b = await req('GET', `/agendamentos/disponibilidade?data=${amanha}`, { token: a.token });
const slot9Livre = r7b.json.data.slots.find((s) => s.inicioAt === new Date(slot9).toISOString());
check('slot 09:00 livre de novo', slot9Livre?.disponivel === true);

// 8. Cancelamento duplo → 409
const r8 = await req('POST', `/agendamentos/${agA}/cancelar`, { token: a.token });
check('cancelamento duplo = 409', r8.status === 409);

// 9. Horário fora do expediente → 422
const slot19 = `${amanha}T19:00:00+02:00`;
const r9 = await req('POST', '/agendamentos', { token: a.token, body: { veiculoId: a.veiculoId, inicioAt: slot19 } });
check('fora de horário = 422', r9.status === 422, r9.json?.error?.code);

// 10. Staff vê a agenda de todos
const r10 = await req('GET', '/agendamentos', { token: adminToken });
check('staff lista agendamentos (>=1)', r10.status === 200 && r10.json.data.length >= 1, `total=${r10.json?.data?.length}`);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);