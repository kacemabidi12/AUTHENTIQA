const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
console.log('REACT_APP_API_BASE_URL =', process.env.REACT_APP_API_BASE_URL);

let logoutHandler = null;
export function setLogoutHandler(fn) {
  logoutHandler = fn;
}

function buildUrl(path) {
  if (!path) return API_BASE || path;
  // if path already absolute, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

async function request(method, path, { body, headers: extraHeaders, params } = {}) {
  const url = new URL(buildUrl(path), window.location.origin);
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(k => {
      if (params[k] != null) url.searchParams.append(k, params[k]);
    });
  }

  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(extraHeaders || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    // auto logout
    if (typeof logoutHandler === 'function') logoutHandler();
    const err = new Error('Unauthorized');
    err.status = 401;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

  if (!res.ok) {
    const message = (data && data.message) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts)
};

export default api;