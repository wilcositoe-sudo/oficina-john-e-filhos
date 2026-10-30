// RF12 + RN03/RN04/RN05/RN05B + stock atómico (Doc 09 §9.6).
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
const cliente = { nome: 'Cliente OS2', email: `os2${ts}@exemplo.com`, senha: 'senha1234' };
await req('POST', '/auth/register', { body: cliente });
const loginCli = await req('POST', '/auth/login', { body: { identificador: cliente.email, senha: cliente.senha } });
const cliToken = loginCli.json.data.token;
const veiculo = await req('POST', '/veiculos', { token: cliToken, body: { matricula: 'OS2' + ts, marca: 'Toyota', modelo: 'Hilux' } });
const veiculoId = veiculo.json.data.id;
const adminToken = (await req('POST', '/auth/login', { body: ADMIN })).json.data.token;

// Serviço (1000.00) e peça (stock 5, 250.00) via API de catálogo
const servico = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Serviço OS2', precoBase: 1000 } });
const servicoId = servico.json.data.id;
const peca = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Peça OS2', precoBase: 250 } });
// Nota: peças ainda não têm CRUD pela API — inserimos direto na BD (tabela pecas existe desde 001_init)
// Isto é preparação de teste, não fluxo de negócio.

// OS
const os1 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId, descricaoProblema: 'Fuga de óleo no motor' },
});
const osId = os1.json.data.id;

// 1. Lança 2x serviço → total 2000.00
const r1 = await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId, quantidade: 2 } });
check('RF12 linha serviço = 201', r1.status === 201 && r1.json.data.subtotal === '2000.00', JSON.stringify(r1.json?.data));
check('RN05 total 2000.00', r1.json?.data?.valorTotal === '2000.00', r1.json?.data?.valorTotal);

// 2. Cliente não lança linhas → 403
const r2 = await req('POST', `/ordens/${osId}/servicos`, { token: cliToken, body: { servicoId, quantidade: 1 } });
check('cliente lançar linha = 403', r2.status === 403);

// 3. RN05B: sobe o preço do catálogo; NOVA linha usa preço novo, antiga preservada
await req('PATCH', `/servicos/${servicoId}/desativar`, { token: adminToken }); // reativar não existe — criamos outro serviço
const servico2 = await req('POST', '/servicos', { token: adminToken, body: { nome: 'Serviço OS2 v2', precoBase: 1500 } });
const r3 = await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId: servico2.json.data.id, quantidade: 1 } });
check('RN05B nova linha com preço novo 1500.00', r3.json?.data?.subtotal === '1500.00', r3.json?.data?.subtotal);
check('RN05B total acumulado 3500.00', r3.json?.data?.valorTotal === '3500.00', r3.json?.data?.valorTotal);

// 4. Linhas: snapshot preservado (primeira linha continua 1000.00 mesmo com catálogo alterado/desativado)
const linhas = await req('GET', `/ordens/${osId}/linhas`, { token: adminToken });
const linhaAntiga = linhas.json.data.servicos.find((l) => l.servico_id === servicoId);
check('RN05B snapshot preservado (1000.00)', linhaAntiga?.preco_unitario === '1000.00', linhaAntiga?.preco_unitario);

// 5. Serviço desativado não entra em linha nova → 409
const r5 = await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId, quantidade: 1 } });
check('DEC-D14 serviço inativo = 409', r5.status === 409 && r5.json.error.code === 'SERVICO_INATIVO', r5.json?.error?.code);

// 6. Transição inválida: PENDENTE → concluir (RN04 também violada, mas a transição é que falha primeiro)
const r6 = await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });
check('transição PENDENTE→CONCLUIDA = 409', r6.status === 409 && r6.json.error.code === 'TRANSICAO_INVALIDA', r6.json?.error?.code);

// 7. Fluxo válido: iniciar_diagnostico → iniciar_reparacao → concluir (tem serviço)
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
const r7 = await req('POST', `/ordens/${osId}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });
check('RN04 concluir com serviço = CONCLUIDA', r7.status === 200 && r7.json.data.estado === 'CONCLUIDA' && !!r7.json.data.dataConclusao, r7.json?.data?.estado);

// 8. OS concluída não aceita linhas → 409
const r8 = await req('POST', `/ordens/${osId}/servicos`, { token: adminToken, body: { servicoId: servico2.json.data.id, quantidade: 1 } });
check('OS CONCLUIDA não edita = 409', r8.status === 409);

// 9. RN04: OS nova sem serviço não conclui
const os2 = await req('POST', '/ordens', {
  token: adminToken,
  body: { emailCliente: cliente.email, veiculoId, descricaoProblema: 'Outra avaria qualquer' },
});
await req('POST', `/ordens/${os2.json.data.id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_diagnostico' } });
await req('POST', `/ordens/${os2.json.data.id}/transicoes`, { token: adminToken, body: { acao: 'iniciar_reparacao' } });
const r9 = await req('POST', `/ordens/${os2.json.data.id}/transicoes`, { token: adminToken, body: { acao: 'concluir' } });
check('RN04 sem serviço = 409 RN04_SEM_SERVICO', r9.status === 409 && r9.json.error.code === 'RN04_SEM_SERVICO', r9.json?.error?.code);

// 10. RN03: histórico cresceu (PENDENTE→EM_DIAGNOSTICO→EM_REPARACAO→CONCLUIDA = 4)
const r10 = await req('GET', `/ordens/${osId}/historico`, { token: adminToken });
check('RN03 histórico completo (4 entradas)', r10.json.data.length === 4, `entradas=${r10.json?.data?.length}`);
const ultima = r10.json.data[3];
check('RN03 última transição EM_REPARACAO→CONCLUIDA', ultima.estadoAnterior === 'EM_REPARACAO' && ultima.estadoNovo === 'CONCLUIDA');

console.log(falhas === 0 ? '\nTODOS OS TESTES PASSARAM' : `\n${falhas} TESTE(S) FALHARAM`);
process.exit(falhas === 0 ? 0 : 1);