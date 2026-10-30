const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// DEC-D09: localStorage em dev; revisar antes de produção
export function getToken() {
  return localStorage.getItem('oficina_token');
}
export function setToken(token) {
  token ? localStorage.setItem('oficina_token', token) : localStorage.removeItem('oficina_token');
}

// Regras de negócio NUNCA aqui — só transporte HTTP e erros normalizados
export async function api(metodo, caminho, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE_URL + caminho, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'ERRO_DESCONHECIDO',
      json?.error?.message ?? 'Erro inesperado.',
      json?.error?.details,
    );
  }
  return json?.data;
}