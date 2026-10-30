// Dinheiro em cêntimos (inteiros) — RN05: nunca float em cálculos.
// Nas fronteiras (API/SQL) converte-se para string decimal "1500.00".
export function paraCentimos(valor) {
  const s = String(valor ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [inteiro, dec] = s.split('.');
  return Number(inteiro) * 100 + Number((dec ?? '').padEnd(2, '0') || 0);
}

export function deCentimos(centimos) {
  return (centimos / 100).toFixed(2);
}

export function subtotalCentimos(precoCentimos, quantidade) {
  return precoCentimos * quantidade; // quantidade inteira → resultado exato
}