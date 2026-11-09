export const OFICINA = {
  nome: 'Oficina John e Filhos',
  horario: 'Segunda a Sábado, das 08:00 às 17:00',
  morada: 'Maputo, Moçambique',
  telefone: '+258 84 000 0000',
  email: 'contacto@oficinajohnfilhos.co.mz',

  // ⚠️ Ajusta para as coordenadas REAIS da oficina (sem isto a distância fica errada).
  coordenadas: { lat: -25.9692, lng: 32.5732 },

  // Taxa para a oficina IR BUSCAR o carro a casa do cliente (pré-OS).
  // Põe 0 se a recolha for gratuita.
  taxaRecolhaParaOficina: 0,

  // Entrega FINAL pós-reparação ao domicílio (usada na OS em CONCLUIDA).
  taxaDomicilio: 500,

  velocidadeMediaKmH: 30,
  moeda: 'MZN',

  diasFuncionamento: [1, 2, 3, 4, 5, 6], // 1=Seg … 6=Sáb, 0=Dom
  horaAbertura: 8,
  horaFechamento: 17,
  duracaoSlotMinutos: 60,
  diasAntecipacaoSlots: 7,
};

export const fmtMoeda = (v) => `${Number(v ?? 0).toFixed(2)} ${OFICINA.moeda}`;

export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function tempoEstimadoMin(distancia, velocidadeKmH = OFICINA.velocidadeMediaKmH) {
  const km = Number(distancia ?? 0);
  const v = Number(velocidadeKmH ?? 30);
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.max(5, Math.round((km / v) * 60));
}