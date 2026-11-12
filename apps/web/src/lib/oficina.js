export const OFICINA_WEB = {
  nome: 'Oficina John e Filhos',
  morada: 'Perto do Mercado Municipal, Moatize, Tete, Moçambique',
  referenciaMapa: 'Mercado Municipal de Moatize (referência aproximada)',
  telefone: '+258 84 000 0000',
  email: 'contacto@oficinajohnfilhos.co.mz',

  // Ponto de referência informado pela oficina; substituir pelo portão quando houver coordenadas exatas.
  coordenadas: {
    lat: -16.1168699,
    lng: 33.7435863,
  },

  // Taxa para a oficina ir buscar o carro a casa do cliente, antes da OS.
  // Põe 0 se a recolha for gratuita.
  taxaRecolhaParaOficina: 0,

  // Entrega final pós-reparação ao domicílio.
  // Isto é usado na OS em CONCLUIDA, não no chatbot.
  taxaEntregaDomicilio: 500,

  // Estimativa simples para deslocação urbana.
  velocidadeMediaKmH: 30,
};

export function distanciaKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // raio da Terra em km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function tempoEstimadoMin(distancia, velocidadeKmH = OFICINA_WEB.velocidadeMediaKmH) {
  const km = Number(distancia ?? 0);
  const velocidade = Number(velocidadeKmH ?? 30);
  if (!Number.isFinite(km) || km <= 0) return 0;
  return Math.max(5, Math.round((km / velocidade) * 60));
}

export function fmtMoedaWeb(v) {
  return `${Number(v ?? 0).toFixed(2)} MZN`;
}