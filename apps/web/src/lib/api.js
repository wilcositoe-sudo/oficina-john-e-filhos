const TOKEN_KEY = 'oficina_token';
const LEGACY_TOKEN_KEYS = ['oficina_token', 'token', 'auth_token'];

export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const API_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY);
    LEGACY_TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
    return;
  }

  sessionStorage.setItem(TOKEN_KEY, token);
}

export function absolutaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function extrairMensagemErro(json, status) {
  return (
    json?.erro?.mensagem ||
    json?.erro?.message ||
    json?.error?.message ||
    json?.message ||
    json?.detail ||
    `Erro ${status}`
  );
}

export async function api(method, path, options = {}) {
  const {
    body,
    headers,
    auth = true,
    ...rest
  } = options;

  const token = auth ? getToken() : null;
  const isFormData = body instanceof FormData;
  const isStringBody = typeof body === 'string';

  const finalHeaders = {
    ...(isFormData || isStringBody ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers ?? {}),
  };

  const finalBody =
    isFormData || isStringBody
      ? body
      : body != null
        ? JSON.stringify(body)
        : undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
    ...rest,
  });

  const text = await res.text();

  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  if (!res.ok) {
    const mensagem = extrairMensagemErro(json, res.status);

    if (res.status === 401) {
      setToken(null);
    }

    throw new Error(mensagem);
  }

  // O backend devolve quase sempre { data: ... }.
  // Se vier embrulhado, destrua aqui para o frontend receber o objeto directo.
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data;
  }

  return json;
}