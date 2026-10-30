// Horário de funcionamento (DEC-D12 — proposta Doc 03 §3.4, pendente de aprovação).
// Fuso Africa/Maputo (+02:00, sem DST). Slots de 1h, inícios das 08:00 às 16:00.
export const FUSO = '+02:00';
export const HORA_ABERTURA = 8;
export const HORA_FECHO = 17;
export const DURACAO_SLOT_MS = 60 * 60 * 1000;

// Lista de slots do dia (ISO com fuso), marcando ocupados. Passados não são oferecidos.
export function slotsDoDia(dataISO, ocupados, agora = new Date()) {
  const slots = [];
  for (let h = HORA_ABERTURA; h + 1 <= HORA_FECHO; h++) {
    const inicio = new Date(`${dataISO}T${String(h).padStart(2, '0')}:00:00${FUSO}`);
    const fim = new Date(inicio.getTime() + DURACAO_SLOT_MS);
    slots.push({
      inicioAt: inicio.toISOString(),
      fimAt: fim.toISOString(),
      disponivel: !ocupados.has(inicio.toISOString()) && fim > agora,
    });
  }
  return slots;
}

// Primeiro dia válido para marcação = hoje (slots futuros) ou amanhã se já fechou.
export function dataDoPedido(dataParam, agora = new Date()) {
  const hoje = agora.toLocaleDateString('sv-SE', { timeZone: 'Africa/Maputo' }); // YYYY-MM-DD
  if (dataParam && /^\d{4}-\d{2}-\d{2}$/.test(dataParam)) return dataParam;
  return hoje;
}