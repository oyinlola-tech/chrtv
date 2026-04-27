const TOKEN_KEY = 'chrtv_token';
const USER_KEY = 'chrtv_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Request failed');
  }

  return payload;
}

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  dashboardStats: () => request('/api/dashboard/stats'),
  dashboardPositions: () => request('/api/dashboard/positions?limit=100'),
  dashboardEvents: () => request('/api/dashboard/events'),
  orders: () => request('/api/orders'),
  createOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  facilities: () => request('/api/facilities'),
  createFacility: (body) => request('/api/facilities', { method: 'POST', body: JSON.stringify(body) }),
  assignments: () => request('/api/assignments'),
  createAssignment: (body) => request('/api/assignments', { method: 'POST', body: JSON.stringify(body) }),
  devices: () => request('/api/devices'),
  sendDeviceCommand: (body) => request('/api/devices/command', { method: 'POST', body: JSON.stringify(body) }),
  integrationConfig: () => request('/api/integration/config'),
  updateIntegrationConfig: (body) => request('/api/integration/config', { method: 'PUT', body: JSON.stringify(body) }),
  integrationLogs: () => request('/api/integration/logs'),
  users: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
};

