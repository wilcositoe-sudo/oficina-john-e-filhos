// RF06/RF13/RF14 + RN06 + idempotência (duplo clique + webhook duplicado) + auto-PAGA.
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
const cliente = { nome: 'Cliente Pag', email: `pag${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cliente });
const cliToken = (await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } })).json.data.token;
const veiculo = await req('POST', '/veiculos', { token: cliToken, body: { matricula: 'PG' + ts, marca: 'Toyota', modelo: 'Corolla' } });
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// Serviço 500.00 + OS concluída (total 500.00)
const servico = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Serviço Pag', precoBase: 500 } });
const os = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'OS para testes de pagamento' },
});
const osId = os.json.data.id;
await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId: servico.json.data.id, quantidade: 1 } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });

// OS ABERTA (outra) para testar elegibilidade RN06
const osAberta = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'Outra OS ainda aberta' },
});

// 1. RN06: pagamento em OS não concluída → 409
const r1 = await req('POST', `/ordens/${osAberta.json.data.id}/pagamentos`, { token: adminToken, body: { metodo: 'PRESENCIAL', valor: '0.00' } });
check('RN06 OS aberta = 409', r1.status === 409 && r1.json.error.code === 'OS_NAO_ELEGIVEL_PAGAMENTO', r1.json?.error?.code);

// 2. Presencial por cliente → 403
const r2 = await req('POST', `/ordens/${osId}/pagamentos`, { token: cliToken, body: { metodo: 'PRESENCIAL', valor: '500.00' } });
check('presencial por cliente = 403', r2.status === 403);

// 3. Presencial com valor errado → 422
const r3 = await req('POST', `/ordens/${osId}/pagamentos`, { token: adminToken, body: { metodo: 'PRESENCIAL', valor: '400.00' } });
check('valor divergente = 422', r3.status === 422, r3.json?.error?.code);

// 4. Presencial certo → CONFIRMADO + recibo + OS PAGA (DEC-D17)
const r4 = await req('POST', `/ordens/${osId}/pagamentos`, { token: adminToken, body: { metodo: 'PRESENCIAL', valor: '500.00', idempotencyKey: `pres-${ts}` } });
check('presencial = CONFIRMADO', r4.status === 201 && r4.json.data.estado === 'CONFIRMADO', JSON.stringify(r4.json?.data));
const r4b = await req('GET', `/ordens/${osId}`, { token: adminToken });
check('DEC-D17 OS transita para PAGA', r4b.json.data.estado === 'PAGA', r4b.json?.data?.estado);
const pagPresencialId = r4.json.data.id;

// 5. RF14/RN06: recibo disponível e com número REC-
const r5 = await req('GET', `/pagamentos/${pagPresencialId}/recibo`, { token: cliToken });
check('recibo = 200 com número REC-', r5.status === 200 && /^REC-\d{4}-\d{6}$/.test(r5.json.data.numero), r5.json?.data?.numero);
check('recibo tem snapshot da OS', r5.json?.data?.snapshot?.numeroOS === os.json.data.numeroOS);
// Reimpressão devolve o mesmo (sem novo pagamento)
const r5b = await req('GET', `/pagamentos/${pagPresencialId}/recibo`, { token: adminToken });
check('reimpressão = mesmo recibo', r5b.json.data.id === r5.json.data.id && r5b.json.data.numero === r5.json.data.numero);

// ===== OS 2 — pagamento digital (fake) =====
const os2 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId: veiculo.json.data.id, descricaoProblema: 'OS para pagamento digital fake' },
});
const os2Id = os2.json.data.id;
await req('POST', `/ordens/${os2Id}/servicos`, { token: adminToken, body: { servicoId: servico.json.data.id, quantidade: 1 } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
await req('POST', `/ordens/${os2Id}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });

// 6. Cliente inicia pagamento digital → PENDENTE com valor do SERVIDOR (500.00)
const r6 = await req('POST', `/ordens/${os2Id}/pagamentos`, { token: cliToken, body: { metodo: 'MOBILE_MONEY', idempotencyKey: `dig-${ts}` } });
check('digital = PENDENTE valor servidor', r6.status === 201 && r6.json.data.estado === 'PENDENTE' && r6.json.data.valor === '500.00', JSON.stringify(r6.json?.data));
const refInterna = r6.json.data.referenciaInterna;
const pagDigitalId = r6.json.data.id;

// 7. Idempotência: mesmo idempotencyKey → 200 e MESMO pagamento (sem dupla cobrança)
const r7 = await req('POST', `/ordens/${os2Id}/pagamentos`, { token: cliToken, body: { metodo: 'MOBILE_MONEY', idempotencyKey: `dig-${ts}` } });
check('idempotência devolve o mesmo pagamento', r7.status === 200 && r7.json.data.id === pagDigitalId, `status=${r7.status}`);

// 8. Recibo ainda NÃO disponível (pagamento pendente — RN06)
const r8 = await req('GET', `/pagamentos/${pagDigitalId}/recibo`, { token: cliToken });
check('recibo antes de confirmar = 409', r8.status === 409, r8.json?.error?.code);

// 9. Webhook FALHA → RECUSADO, OS continua CONCLUIDA (não PAGA)
const r9 = await req('POST', '/webhooks/pagamentos/fake', { body: { referenciaInterna: refInterna, resultado: 'falha', idEvento: `ev-${ts}` } });
check('webhook falha = RECUSADO', r9.json.data.estado === 'RECUSADO', JSON.stringify(r9.json?.data));
const r9b = await req('GET', `/ordens/${os2Id}`, { token: adminToken });
check('recusa não paga a OS', r9b.json.data.estado === 'CONCLUIDA', r9b.json?.data?.estado);

// 10. Nova tentativa digital (outra chave) → webhook SUCESSO → CONFIRMADO + PAGA + recibo
const r10 = await req('POST', `/ordens/${os2Id}/pagamentos`, { token: cliToken, body: { metodo: 'MOBILE_MONEY', idempotencyKey: `dig2-${ts}` } });
const ref2 = r10.json.data.referenciaInterna;
const r10b = await req('POST', '/webhooks/pagamentos/fake', { body: { referenciaInterna: ref2, resultado: 'sucesso', idEvento: `ev2-${ts}` } });
check('webhook sucesso = CONFIRMADO', r10b.json.data.estado === 'CONFIRMADO');
check('DEC-D17 OS2 → PAGA', r10b.json.data.osEstado === 'PAGA', r10b.json?.data?.osEstado);
check('RF14 recibo emitido no webhook', /^REC-/.test(r10b.json.data.recibo ?? ''), r10b.json?.data?.recibo);

// 11. Webhook DUPLICADO (mesmo idEvento) → sem efeito duplo
const r11 = await req('POST', '/webhooks/pagamentos/fake', { body: { referenciaInterna: ref2, resultado: 'sucesso', idEvento: `ev2-${ts}` } });
check('webhook duplicado = duplicado:true', r11.json.data.duplicado === true, JSON.stringify(r11.json?.data));
const pag2 = await req('GET', `/ordens/${os2Id}/pagamentos`, { token: adminToken });
const confirmados = pag2.json.data.filter((p) => p.estado === 'CONFIRMADO');
check('um único pagamento confirmado', confirmados.length === 1, `confirmados=${confirmados.length}`);

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);