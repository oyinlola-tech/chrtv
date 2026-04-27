import { clearSession, getUser } from './api.js';

const navItems = [
  { href: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { href: '/orders', key: 'orders', label: 'Orders' },
  { href: '/assignments', key: 'assignments', label: 'Assignments' },
  { href: '/facilities', key: 'facilities', label: 'Facilities' },
  { href: '/devices', key: 'devices', label: 'Devices' },
  { href: '/integration', key: 'integration', label: 'Integration' },
  { href: '/users', key: 'users', label: 'Users' },
];

export function protectPage() {
  if (!localStorage.getItem('chrtv_token')) {
    window.location.href = '/auth/login';
  }
}

export function logout() {
  clearSession();
  window.location.href = '/auth/login';
}

export function formatDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString();
}

export function flash(message, tone = 'slate') {
  const host = document.querySelector('[data-flash]');
  if (!host) return;
  host.innerHTML = `<div class="rounded-2xl px-4 py-3 text-sm ${tone === 'success' ? 'bg-emerald-50 text-emerald-700' : tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}">${message}</div>`;
  setTimeout(() => {
    host.innerHTML = '';
  }, 3200);
}

export function renderShell(pageKey, title, subtitle, content) {
  const activeUser = getUser();
  const app = document.getElementById('app-shell');
  const nav = navItems.map((item) => {
    const active = item.key === pageKey;
    return `<a href="${item.href}" class="rounded-2xl px-4 py-3 text-sm transition ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-white'}">${item.label}</a>`;
  }).join('');

  app.innerHTML = `
    <div class="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside class="border-r border-slate-200 bg-white px-5 py-6">
        <div class="flex items-center gap-3">
          <img src="/assets/logo.svg" alt="CH RTV" class="h-12 w-12">
          <div>
            <h1 class="font-display text-xl text-ink">CH RTV</h1>
            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Admin Console</p>
          </div>
        </div>
        <nav class="mt-8 grid gap-2">${nav}</nav>
        <div class="mt-8 rounded-[1.6rem] bg-[linear-gradient(135deg,_#081221,_#0f4c81)] p-5 text-white">
          <p class="text-xs uppercase tracking-[0.24em] text-orange-200">Current User</p>
          <p class="mt-2 font-display text-lg">${activeUser?.username || 'Unknown'}</p>
          <p class="text-sm text-slate-200">${activeUser?.role || 'operator'}</p>
        </div>
        <button id="logout-btn" class="mt-6 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">Sign out</button>
      </aside>
      <main class="px-5 py-6 lg:px-8">
        <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-tide">Carrier Haulage Visibility</p>
            <h2 class="mt-2 font-display text-3xl text-ink">${title}</h2>
            <p class="mt-2 max-w-3xl text-sm text-slate-500">${subtitle}</p>
          </div>
          <div data-flash class="min-w-[220px]"></div>
        </header>
        ${content}
      </main>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

export function card(label, value, accent = 'bg-white') {
  return `<article class="${accent} rounded-[1.8rem] border border-slate-200 p-5 shadow-sm">
    <p class="text-xs uppercase tracking-[0.24em] text-slate-400">${label}</p>
    <p class="mt-3 font-display text-3xl text-ink">${value}</p>
  </article>`;
}

export function table(headers, rowsHtml) {
  const head = headers.map((value) => `<th class="px-4 py-3 text-left text-xs uppercase tracking-[0.24em] text-slate-400">${value}</th>`).join('');
  return `<div class="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm"><table class="min-w-full"><thead class="bg-slate-50"><tr>${head}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
}
