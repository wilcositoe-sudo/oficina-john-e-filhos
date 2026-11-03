const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function api(method, path, { body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  // SÓ adiciona o token se auth for true
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await response.json();

  if (!response.ok) {
    // Lança o erro exatamente como o backend o formatou
    throw new Error(json.error?.message || 'Erro na requisição');
  }

  return json.data;
}