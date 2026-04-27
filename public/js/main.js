import { api, setSession } from './api.js';
import { card, flash, formatDate, protectPage, renderShell, table } from './ui.js';
import { createPositionMap, enableFacilityPicker, renderPositionMarkers } from './map.js';

const page = document.body.dataset.page;

if (page !== 'login') {
  protectPage();
}

const pages = {
  login: initLogin,
  dashboard: initDashboard,
  orders: initOrders,
  assignments: initAssignments,
  devices: initDevices,
  integration: initIntegration,
  facilities: initFacilities,
  users: initUsers,
};

pages[page]?.();

async function initLogin() {
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('hidden');
    try {
      const session = await api.login({
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
      });
      setSession(session);
      window.location.href = '/dashboard';
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.classList.remove('hidden');
    }
  });
}

async function initDashboard() {
  renderShell('dashboard', 'Operational Dashboard', 'Live device count, latest coordinates, and recent transport events across the platform.', `
    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="dashboard-cards"></section>
    <section class="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-display text-xl text-ink">Live Positions</h3>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-orange-600">OpenStreetMap</span>
        </div>
        <div id="dashboard-map" class="h-[420px] rounded-[1.4rem]"></div>
      </div>
      <div id="dashboard-events"></div>
    </section>
  `);

  const [stats, positionFeed] = await Promise.all([api.dashboardStats(), api.dashboardPositions()]);

  document.getElementById('dashboard-cards').innerHTML = [
    card('Connected Devices', stats.deviceCount),
    card('Active Assignments', stats.activeAssignments, 'bg-orange-50 border-orange-100'),
    card('Orders In Progress', stats.activeOrders),
    card('Integration Mode', stats.integrationOption === 'option1' ? 'Option 1' : 'Option 2', 'bg-blue-50 border-blue-100')
  ].join('');

  const map = createPositionMap('dashboard-map');
  renderPositionMarkers(map, positionFeed.positions || []);

  const rows = (stats.recentEvents || []).slice(0, 10).map((event) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${event.event_type || '--'}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${event.equipmentReference || event.equipment_reference || '--'}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${event.facility?.name || '--'}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${formatDate(event.timestamp)}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="px-4 py-6 text-sm text-slate-500">No recent events yet.</td></tr>`;

  document.getElementById('dashboard-events').innerHTML = `
    <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="mb-4 font-display text-xl text-ink">Recent Events</h3>
      ${table(['Event', 'Equipment', 'Facility', 'Timestamp'], rows)}
    </div>
  `;
}

async function initOrders() {
  renderShell('orders', 'Transport Orders', 'Create transport orders with ordered facility sequence and keep the booking, equipment, and phase linked for integration.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="order-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="orders-table"></div>
    </section>
  `);

  const [ordersRes, facilitiesRes] = await Promise.all([api.orders(), api.facilities()]);
  renderOrderForm(facilitiesRes.facilities || []);
  renderOrdersTable(ordersRes.orders || []);
}

function renderOrderForm(facilities) {
  const host = document.getElementById('order-form');
  const facilityOptions = facilities.map((facility) => `
    <label class="flex items-start gap-3 rounded-2xl border border-slate-200 p-3">
      <input type="checkbox" name="facility-sequence" value="${facility.id}" class="mt-1">
      <span>
        <span class="block text-sm font-medium text-slate-800">${facility.name}</span>
        <span class="text-xs text-slate-500">${facility.facility_type_code} · ${facility.location_code || 'No code'}</span>
      </span>
    </label>
  `).join('');

  host.innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">Create Order</p>
      <h3 class="mt-2 font-display text-2xl text-ink">New transport order</h3>
    </div>
    <input id="order-number" class="field" placeholder="Order number">
    <input id="booking-ref" class="field" placeholder="Carrier booking reference">
    <input id="equipment-reference" class="field" placeholder="Equipment reference">
    <select id="transportation-phase" class="field"><option value="EXPORT">EXPORT</option><option value="IMPORT">IMPORT</option></select>
    <select id="mode-of-transport" class="field"><option value="TRUCK">TRUCK</option><option value="RAIL">RAIL</option><option value="BARGE">BARGE</option><option value="VESSEL">VESSEL</option></select>
    <div class="space-y-2">
      <p class="text-sm font-medium text-slate-700">Facility sequence</p>
      <div class="grid gap-2 max-h-[280px] overflow-auto">${facilityOptions || '<p class="text-sm text-slate-500">Create facilities first.</p>'}</div>
    </div>
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save order</button>
  `;

  host.addEventListener('submit', async (event) => {
    event.preventDefault();
    const facilitySequence = Array.from(host.querySelectorAll('input[name="facility-sequence"]:checked')).map((item) => Number(item.value));
    await api.createOrder({
      order_number: document.getElementById('order-number').value.trim(),
      carrier_booking_ref: document.getElementById('booking-ref').value.trim(),
      equipment_reference: document.getElementById('equipment-reference').value.trim(),
      transportation_phase: document.getElementById('transportation-phase').value,
      mode_of_transport: document.getElementById('mode-of-transport').value,
      facility_sequence: facilitySequence,
    });
    flash('Order created', 'success');
    initOrders();
  });
}

function renderOrdersTable(orders) {
  const rows = orders.map((order) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${order.order_number}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${order.equipment_reference}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${order.transportation_phase}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${(order.facilities || []).map((item) => item.name).join(' -> ') || '--'}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="px-4 py-6 text-sm text-slate-500">No orders available.</td></tr>`;

  document.getElementById('orders-table').innerHTML = table(['Order', 'Equipment', 'Phase', 'Facility Sequence'], rows);
}

async function initAssignments() {
  renderShell('assignments', 'Assignments', 'Bind a known COBAN IMEI and optional license plate to a transport order. Saving triggers 121 geofence provisioning.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="assignment-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="assignments-table"></div>
    </section>
  `);

  const [ordersRes, assignmentsRes] = await Promise.all([api.orders(), api.assignments()]);
  const orderOptions = (ordersRes.orders || []).map((order) => `<option value="${order.id}">${order.order_number} · ${order.equipment_reference}</option>`).join('');
  document.getElementById('assignment-form').innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">New Assignment</p>
      <h3 class="mt-2 font-display text-2xl text-ink">Assign device</h3>
    </div>
    <select id="assignment-order" class="field">${orderOptions}</select>
    <input id="assignment-imei" class="field" placeholder="IMEI">
    <input id="assignment-plate" class="field" placeholder="License plate">
    <input id="assignment-originator" class="field" placeholder="Originator name">
    <input id="assignment-partner" class="field" placeholder="Partner name (optional)">
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save assignment</button>
  `;

  document.getElementById('assignment-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.createAssignment({
      transport_order_id: Number(document.getElementById('assignment-order').value),
      imei: document.getElementById('assignment-imei').value.trim(),
      license_plate: document.getElementById('assignment-plate').value.trim(),
      originator_name: document.getElementById('assignment-originator').value.trim(),
      partner_name: document.getElementById('assignment-partner').value.trim(),
      is_active: true,
    });
    flash('Assignment created and geofence commands queued', 'success');
    initAssignments();
  });

  const rows = (assignmentsRes.assignments || []).map((assignment) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${assignment.imei}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${assignment.order_number}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${assignment.license_plate || '--'}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${assignment.originator_name}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="px-4 py-6 text-sm text-slate-500">No assignments available.</td></tr>`;

  document.getElementById('assignments-table').innerHTML = table(['IMEI', 'Order', 'Plate', 'Originator'], rows);
}

async function initDevices() {
  renderShell('devices', 'Devices', 'Monitor active gateway sockets and send COBAN server commands through the gateway proxy.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="command-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-tide">Command Center</p>
          <h3 class="mt-2 font-display text-2xl text-ink">Send device command</h3>
        </div>
        <input id="command-imei" class="field" placeholder="IMEI">
        <input id="command-keyword" class="field" placeholder="Keyword, e.g. 121">
        <textarea id="command-params" class="field min-h-[120px]" placeholder="Params, e.g. 22.353648,113.543678 area01,800m"></textarea>
        <button class="rounded-2xl bg-ember px-4 py-3 text-white">Send command</button>
      </form>
      <div id="devices-table"></div>
    </section>
  `);

  const devicesRes = await api.devices();
  document.getElementById('command-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.sendDeviceCommand({
      imei: document.getElementById('command-imei').value.trim(),
      keyword: document.getElementById('command-keyword').value.trim(),
      params: document.getElementById('command-params').value.trim(),
    });
    flash('Command sent', 'success');
  });

  const rows = (devicesRes.devices || []).map((device) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${device.imei}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${formatDate(device.connectedAt)}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${formatDate(device.lastSeenAt)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" class="px-4 py-6 text-sm text-slate-500">No active devices connected.</td></tr>`;
  document.getElementById('devices-table').innerHTML = table(['IMEI', 'Connected', 'Last Seen'], rows);
}

async function initIntegration() {
  renderShell('integration', 'Integration Control', 'Switch between direct CMA-CGM delivery and the Option 2 stub. Review the current configuration and recent outbound logs.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="integration-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div id="integration-logs"></div>
    </section>
  `);

  const [configRes, logsRes] = await Promise.all([api.integrationConfig(), api.integrationLogs()]);
  const config = configRes.config;
  document.getElementById('integration-form').innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">Outbound Mode</p>
      <h3 class="mt-2 font-display text-2xl text-ink">Configuration</h3>
    </div>
    <select id="active-option" class="field">
      <option value="option1" ${config.active_option === 'option1' ? 'selected' : ''}>Option 1 - Direct API</option>
      <option value="option2" ${config.active_option === 'option2' ? 'selected' : ''}>Option 2 - S3PWEB Stub</option>
    </select>
    <input id="base-url" class="field" placeholder="Option 1 API base URL" value="${config.option1_api_base_url || ''}">
    <input id="auth-token" class="field" placeholder="Bearer token" value="${config.option1_auth_token || ''}">
    <input id="interval-seconds" class="field" type="number" min="60" value="${config.option1_coordinates_interval_seconds || 600}">
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save configuration</button>
  `;

  document.getElementById('integration-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.updateIntegrationConfig({
      ...config,
      active_option: document.getElementById('active-option').value,
      option1_api_base_url: document.getElementById('base-url').value.trim(),
      option1_auth_token: document.getElementById('auth-token').value.trim(),
      option1_coordinates_interval_seconds: Number(document.getElementById('interval-seconds').value || 600),
      option2_settings_json: {},
    });
    flash('Integration configuration updated', 'success');
    initIntegration();
  });

  const rows = (logsRes.logs || []).map((log) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${log.direction}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${log.response_http_code}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${formatDate(log.created_at)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" class="px-4 py-6 text-sm text-slate-500">No integration logs yet.</td></tr>`;
  document.getElementById('integration-logs').innerHTML = table(['Direction', 'HTTP Code', 'Created'], rows);
}

async function initFacilities() {
  renderShell('facilities', 'Facilities and Geofences', 'Create depot, customer, terminal, and ramp facilities. Click the map to capture coordinates and radius for the geofence center.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="facility-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4"></form>
      <div class="grid gap-6">
        <div class="rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="mb-4 font-display text-xl text-ink">Facility Map</h3>
          <div id="facility-map" class="h-[360px] rounded-[1.4rem]"></div>
        </div>
        <div id="facilities-table"></div>
      </div>
    </section>
  `);

  const facilitiesRes = await api.facilities();
  document.getElementById('facility-form').innerHTML = `
    <div>
      <p class="text-xs uppercase tracking-[0.24em] text-tide">New Facility</p>
      <h3 class="mt-2 font-display text-2xl text-ink">Save geofence center</h3>
    </div>
    <input id="facility-name" class="field" placeholder="Facility name">
    <select id="facility-type" class="field"><option value="DEPO">DEPO</option><option value="CLOC">CLOC</option><option value="POTE">POTE</option><option value="RAMP">RAMP</option></select>
    <input id="facility-code" class="field" placeholder="Location code">
    <input id="facility-lat" class="field" placeholder="Latitude">
    <input id="facility-lng" class="field" placeholder="Longitude">
    <input id="facility-radius" class="field" type="number" value="500" placeholder="Radius meters">
    <textarea id="facility-address" class="field min-h-[120px]" placeholder='Address JSON, e.g. {"city":"Lagos","country":"Nigeria"}'></textarea>
    <button class="rounded-2xl bg-ember px-4 py-3 text-white">Save facility</button>
  `;

  const map = createPositionMap('facility-map');
  enableFacilityPicker(map, ({ lat, lng, updateRadius }) => {
    document.getElementById('facility-lat').value = lat.toFixed(7);
    document.getElementById('facility-lng').value = lng.toFixed(7);
    document.getElementById('facility-radius').oninput = (event) => updateRadius(Number(event.target.value || 500));
  });

  document.getElementById('facility-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const addressRaw = document.getElementById('facility-address').value.trim();
    await api.createFacility({
      name: document.getElementById('facility-name').value.trim(),
      facility_type_code: document.getElementById('facility-type').value,
      location_code: document.getElementById('facility-code').value.trim(),
      latitude: Number(document.getElementById('facility-lat').value),
      longitude: Number(document.getElementById('facility-lng').value),
      radius_meters: Number(document.getElementById('facility-radius').value || 500),
      address_json: addressRaw ? JSON.parse(addressRaw) : null,
    });
    flash('Facility created', 'success');
    initFacilities();
  });

  const rows = (facilitiesRes.facilities || []).map((facility) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${facility.name}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${facility.facility_type_code}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${facility.latitude}, ${facility.longitude}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${facility.radius_meters}m</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="px-4 py-6 text-sm text-slate-500">No facilities yet.</td></tr>`;
  document.getElementById('facilities-table').innerHTML = table(['Name', 'Type', 'Coordinates', 'Radius'], rows);
}

async function initUsers() {
  renderShell('users', 'User Management', 'Create admin or operator users for the admin API JWT login flow.', `
    <section class="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form id="user-form" class="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-tide">Create User</p>
          <h3 class="mt-2 font-display text-2xl text-ink">Access account</h3>
        </div>
        <input id="new-username" class="field" placeholder="Username">
        <input id="new-password" type="password" class="field" placeholder="Password">
        <select id="new-role" class="field"><option value="admin">admin</option><option value="operator">operator</option></select>
        <button class="rounded-2xl bg-ember px-4 py-3 text-white">Create user</button>
      </form>
      <div id="users-table"></div>
    </section>
  `);

  const usersRes = await api.users();
  document.getElementById('user-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api.createUser({
      username: document.getElementById('new-username').value.trim(),
      password: document.getElementById('new-password').value,
      role: document.getElementById('new-role').value,
    });
    flash('User created', 'success');
    initUsers();
  });

  const rows = (usersRes.users || []).map((user) => `
    <tr class="border-t border-slate-100">
      <td class="px-4 py-3 text-sm font-medium text-slate-800">${user.username}</td>
      <td class="px-4 py-3 text-sm text-slate-600">${user.role}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${formatDate(user.created_at)}</td>
    </tr>
  `).join('') || `<tr><td colspan="3" class="px-4 py-6 text-sm text-slate-500">No users yet.</td></tr>`;
  document.getElementById('users-table').innerHTML = table(['Username', 'Role', 'Created'], rows);
}
