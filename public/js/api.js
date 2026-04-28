const TOKEN_KEY = 'chrtv_token';
const USER_KEY = 'chrtv_user';
const CSRF_KEY = 'chrtv_csrf';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getCsrfToken() {
  return sessionStorage.getItem(CSRF_KEY);
}

export function setSession(session) {
  localStorage.setItem(TOKEN_KEY, session.token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  if (session.csrfToken) {
    sessionStorage.setItem(CSRF_KEY, session.csrfToken);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(CSRF_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    clearSession();
    return null;
  }
}

function handleUnauthorized(response) {
  if (response.status === 401 || response.status === 403) {
    clearSession();
    if (window.location.pathname !== '/auth/login') {
      window.location.href = '/auth/login';
    }
  }
}

export async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body != null && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const csrfToken = getCsrfToken();
  if (csrfToken && options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    handleUnauthorized(response);
    const errorMessage = typeof payload === 'object' ? (payload.error || payload.message) : payload;
    throw new Error(errorMessage || `Request failed with status ${response.status}`);
  }

  return payload;
}

async function streamSse(path, { signal, onEvent }) {
  const headers = {
    Accept: 'text/event-stream',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: 'GET',
    headers,
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    handleUnauthorized(response);
    throw new Error(`Stream failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() || '';

    for (const frame of frames) {
      let eventName = 'message';
      const dataLines = [];

      for (const line of frame.split('\n')) {
        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim();
          continue;
        }

        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (dataLines.length) {
        onEvent(eventName, JSON.parse(dataLines.join('\n')));
      }
    }
  }
}

export function openDashboardStream({ onSnapshot, onHeartbeat, onError }) {
  const controller = new AbortController();
  let stopped = false;
  let retryMs = 2000;

  const connect = async () => {
    try {
      await streamSse('/api/dashboard/stream', {
        signal: controller.signal,
        onEvent(eventName, payload) {
          retryMs = 2000;
          if (eventName === 'snapshot') {
            onSnapshot?.(payload);
            return;
          }

          if (eventName === 'heartbeat') {
            onHeartbeat?.(payload);
          }
        },
      });
    } catch (error) {
      if (stopped || controller.signal.aborted) {
        return;
      }

      onError?.(error);
    }

    if (!stopped && !controller.signal.aborted) {
      const nextDelay = retryMs;
      retryMs = Math.min(retryMs * 2, 10000);
      setTimeout(() => {
        if (!stopped && !controller.signal.aborted) {
          connect().catch(() => {});
        }
      }, nextDelay);
    }
  };

  connect().catch((error) => onError?.(error));

  return () => {
    stopped = true;
    controller.abort();
  };
}

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  requestPasswordReset: (body) => request('/api/auth/request-reset', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/api/auth/me'),
  dashboardStats: () => request('/api/dashboard/stats'),
  dashboardPositions: (limit = 100) => request(`/api/dashboard/positions?limit=${Math.min(limit, 500)}`),
  dashboardEvents: () => request('/api/dashboard/events'),
  orders: () => request('/api/orders'),
  createOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  updateOrder: (id, body) => request(`/api/orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOrder: (id) => request(`/api/orders/${id}`, { method: 'DELETE' }),
  facilities: () => request('/api/facilities'),
  createFacility: (body) => request('/api/facilities', { method: 'POST', body: JSON.stringify(body) }),
  updateFacility: (id, body) => request(`/api/facilities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteFacility: (id) => request(`/api/facilities/${id}`, { method: 'DELETE' }),
  assignments: () => request('/api/assignments'),
  createAssignment: (body) => request('/api/assignments', { method: 'POST', body: JSON.stringify(body) }),
  updateAssignment: (id, body) => request(`/api/assignments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAssignment: (id) => request(`/api/assignments/${id}`, { method: 'DELETE' }),
  devices: () => request('/api/devices'),
  sendDeviceCommand: (body) => request('/api/devices/command', { method: 'POST', body: JSON.stringify(body) }),
  integrationConfig: () => request('/api/integration/config'),
  updateIntegrationConfig: (body) => request('/api/integration/config', { method: 'PUT', body: JSON.stringify(body) }),
  integrationLogs: () => request('/api/integration/logs'),
  users: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
};
